# Recherche: kostenlose Werkzeuge & Asset-Quellen für TIEFER

Stand: 27.09.2026. Fokus: kommerziell nutzbar (Steam-Release), realistisch/fotogrammetrisch statt Comic/Low-Poly. Lizenzangaben wurden so weit möglich direkt auf den Quellseiten geprüft (WebFetch); wo das nicht ging, steht das dabei.

**Wichtiger Warnhinweis vorweg:** Nicht jede „kostenlose" oder „Open-Source"-Quelle ist automatisch für ein verkauftes Spiel nutzbar. Immer die einzelne Lizenz pro Asset/Download prüfen, besonders bei Sketchfab (gemischte Lizenzen) und BlendKit (Royalty-Free ≠ Weiterverkauf der Rohdaten).

---

## Top 10 für TIEFER (Kurzempfehlung)

1. **ambientCG** – CC0-PBR-Texturen/Decals/Modelle, größte sichere Quelle für Beton/Metall/Stein/Rost für den „Gothic Neon Lo-Fi"-Look. Bereits im Einsatz, unbedingt weiter ausbauen.
2. **Poly Haven** – CC0-Modelle/HDRIs, ebenfalls schon im Einsatz. Für Regen/Nebel-Atmosphäre besonders die HDRIs nutzen.
3. **Smithsonian Open Access (über Sketchfab, CC0-Filter)** – einzigartige historische/gothic Requisiten (Kirchenkunst, Rüstungen, Knochen/Ossuarium-Motive) ohne Lizenzrisiko.
4. **Blender Studio Human Base Meshes (CC0)** – sauberer Startpunkt für MPFB/Sculpting-Workflow der Monster/NPCs, ergänzt MakeHuman/MPFB.
5. **MPFB2 (GPLv3-Code, CC0-Assets)** – bleibt die richtige Wahl für Menschen; aktiv weiterentwickelt (2.0.17, Juli 2026), direkt in Blender integriert.
6. **CMU Graphics Lab Motion Capture Database** – größte wirklich freie Mocap-Bibliothek, kommerziell nutzbar (nur kein Weiterverkauf der Rohdaten), gut geeignet um die Quaternius-UAL-Animationen zu ergänzen.
7. **Rokoko Motion Library (kostenlose Clips)** – kommerziell nutzbar, gutes Ergänzungsmaterial zu CMU für modernere/spezifische Bewegungen (Horror-typisch: Schleichen, Zögern, Sterben).
8. **Sonniss GDC Game Audio Bundle** – große Menge lizenzfreier SFX (Industrie, Ambiente, Horror-Texturen), kommerziell ohne Attribution, aber KI-Training verboten (für uns irrelevant) und keine Rohdaten-Weitergabe.
9. **gltf-transform + gltfpack (Meshopt/KTX2)** – Pflichtwerkzeug für die three.js-Pipeline, um die vielen neuen glTF-Modelle klein und schnell zu bekommen (passt zur „keine Build-Tools, aber CLI-Vorverarbeitung"-Struktur).
10. **three-mesh-bvh + pmndrs/postprocessing + N8AO** – deckt Kollisions-/Raycast-Performance und AO/Bloom-Feinschliff ab, ohne von der bestehenden Composer-Pipeline (`gfx/renderer.js`) wegzubrechen.

**Wichtigste Lizenz-Warnung:** Hunyuan3D 2.1 schließt die EU explizit aus der Lizenz aus („excluding the European Union, United Kingdom and South Korea") – für den Nutzer in Deutschland damit **nicht nutzbar**, trotz MIT-artiger Optik der Konkurrenz (TRELLIS/TripoSR sind reines MIT und unproblematisch).

---

## 1. Realistische 3D-Modelle/Umgebungen

| Quelle | Lizenz | Was genau | Nutzen für TIEFER | Aufwand/Hürden | Qualität |
|---|---|---|---|---|---|
| [ambientCG](https://ambientcg.com/) | CC0 1.0 (verifiziert via [Lizenzseite](https://docs.ambientcg.com/license/)) | PBR-Materialien, HDRIs, auch Modelle/Decals/Atlanten | Beton, Stein, Marmor, Rost, Fassaden für Dock/Ossuarium/Fabrik-Look | Keine (Direktdownload, kein Konto nötig) | 5/5 |
| [Sketchfab](https://sketchfab.com/) (CC0/CC-BY-Filter, Download-API) | Gemischt – pro Modell prüfen. CC0 = frei, CC-BY = Attribution des Autors **und** Sketchfab-Link/Logo nötig | Riesige Modell-Sammlung inkl. Smithsonian-Scans, Kirchen-/Industrie-Requisiten | Einzelstücke für Dekoration (Statuen, Särge, Maschinen) | Konto + OAuth-Login für Download-API nötig; Lizenz **pro Modell** einzeln prüfen | 4/5 (stark schwankend) |
| [Smithsonian Open Access](https://www.si.edu/openaccess) (via Sketchfab) | CC0 (offiziell bestätigt, seit 2020) | ~1700+ 3D-Scans von Kulturgut (Rüstungen, Skulpturen, Kirchenobjekte, Skelette) | Passt hervorragend zu Ossuarium/Scriptorium-Thema, komplett lizenzsicher | Über Sketchfab-Sammlung „Smithsonian" suchen, Download-Konto nötig | 4/5 |
| [BlendKit](https://www.blendkit.com/) (vormals BlenderKit, im Juni 2026 auf Bitte der Blender Foundation umbenannt) | „Royalty Free" oder CC0 pro Asset | Über 48.000 freie Modelle/Materialien/HDRIs, direkt in Blender integriert | Schnelles Ausstatten von Szenen, gute Add-on-Integration in bestehenden Blender-4.5-Workflow | Kostenloses Konto + Add-on nötig. Royalty-Free-Bedingung: Assets dürfen im fertigen Spiel **nicht leicht extrahierbar** sein (bei glTF-Export unkritisch, bei rohen .blend-Weitergaben nicht erlaubt) | 4/5 |
| [Fab](https://fab.com/) (Epic, Nachfolger von Quixel Bridge) | „Fab Standard License" für über Fab bezogene Assets: **auch außerhalb Unreal Engine** nutzbar. Achtung: alte, über Quixel Bridge/quixel.com geladene Megascans-Bestände liegen unter der alten „Epic Content License" und sind **nur in Unreal Engine** erlaubt | Fotogrammetrie-Scans (Gestein, Böden, Requisiten) in AAA-Qualität | Für Industrie-/Steinboden-Texturen und Requisiten in Gothic-Neon-Stil | Kostenloses Epic-Konto nötig; unbedingt nur Assets nehmen, die **frisch über Fab** beansprucht wurden, nicht alte Bridge-Downloads | 5/5 |
| [OpenGameArt.org](https://opengameart.org/) | Gemischt (CC0/CC-BY/GPL), meist Low-Poly | Games-fokussierte Modelle, wenige realistische Treffer | Nur vereinzelt brauchbar (Requisiten), Stil meist zu simpel für unseren Anspruch | Direktdownload, aber Qualität manuell sichten | 2/5 (für unseren Stil) |
| [Kitbash3D „Free"](https://kitbash3d.com/collections/free-3d-assets) | Free-Kits nur für **nicht-kommerzielle** Zwecke/Demoreels; volle kommerzielle Nutzung erfordert Kauf eines Kits oder Abo | Hochwertige stilisierte Sci-Fi/Gothic-Kits (Cargo-Bibliothek) | Nur als Referenz/Prototyping, nicht für Endprodukt ohne Kauf | „Cargo"-Konto nötig, Lizenz genau lesen | 5/5 Qualität, aber **Lizenz für uns unzureichend ohne Kauf** |
| Textures.com (freies Kontingent) | „Indie License" bei kostenlosen Downloads: kommerziell nutzbar bis 150.000 $ Jahresumsatz/Funding | Zusätzliche PBR-Texturen/Fotos | Ergänzung zu ambientCG, v.a. wenn spezielle Motive fehlen | Kostenloses Konto, tägliches Downloadlimit, niedrigere Auflösung im Gratis-Tier | 3/5 |
| NASA 3D Resources / [images.nasa.gov](https://images.nasa.gov) | Meist Public Domain (US-Regierungswerke) | Weltraum-/Technik-Referenzmaterial, weniger Innenraum-relevant | Für TIEFER kaum direkt relevant (kein Weltraum-Setting) | – | 2/5 (Relevanz) |

---

## 2. PBR-Materialien und Decals

| Quelle | Lizenz | Was genau | Nutzen | Aufwand | Qualität |
|---|---|---|---|---|---|
| [ambientCG – Kategorie „Decals"](https://ambientcg.com/list?category=Decals) | CC0 | Schmutz-/Rost-/Riss-Decals, Atlanten, klassische PBR-Sets (auch „Rust001–004" etc.) | Direkt einsetzbar für Wand-/Bodenschäden, Plakate, Blutspritzer-Basis | Keine | 5/5 |
| [Poly Haven – Texturen](https://polyhaven.com/textures) | CC0 | Hauptsächlich flächige PBR-Materialien, **kein dediziertes Decal-Set** wie bei ambientCG | Ergänzung für organische/natürliche Oberflächen (Holz, Stoff, Erde) | Keine | 5/5 (aber weniger Decals als ambientCG) |
| ShareTextures.com | Angegeben als kostenlos für kommerzielle Zwecke (Lizenzseite prüfen pro Nutzung, nicht direkt verifiziert) | PBR-Sets, kleinere Sammlung als ambientCG | Nur als Zusatzquelle, „Lizenz unklar bis eigene Prüfung" | Konto evtl. nötig | 3/5 – **Lizenz nicht direkt verifiziert, vor Nutzung Seite selbst prüfen** |
| CC0Textures (alter Name von ambientCG) | identisch mit ambientCG | – | – | – | – |

---

## 3. Menschen/NPCs und Monster erstellen

| Werkzeug/Quelle | Lizenz | Was genau | Nutzen | Aufwand | Qualität |
|---|---|---|---|---|---|
| MakeHuman Core-Assets | CC0 (offiziell, kein Zweifel) | Basis-Körper, Standardkleidung/-haare aus dem MakeHuman-Kern | Bereits im Einsatz laut CLAUDE.md | Keine | 4/5 |
| MakeHuman Community-Asset-Packs (`makehumancommunity.org/assets`) | **Gemischt: CC0 oder CC-BY, pro Paket unterschiedlich** – bei CC-BY ist Attribution der Autoren im Abspann/Credits-Datei Pflicht | Zusätzliche Kleidung, Haare, Requisiten für NPCs | Variiert je nach Asset, vor Übernahme jede Paket-Lizenzdatei lesen | Direktdownload, aber Lizenzprüfung pro Datei nötig | 3–4/5 |
| MPFB2 (Blender-Add-on) | Code: GPLv3, gebündelte Assets: CC0 | Parametrisches Charakter-Modeling direkt in Blender 4.5, „One-Click-Create", Alters-/Ethnizitäts-/Körperbau-Slider, Export nach Alembic/USD | Zentral für unsere NPC-Pipeline (schon in CLAUDE.md als Werkzeug gelistet) | Add-on-Installation, aktiv gepflegt (v2.0.17, Juli 2026) | 5/5 |
| Blender Studio „Human Base Meshes" | CC0 | 17 topologisch saubere Sculpting-Basismeshes (männlich/weiblich/divers), Multi-Res, UDIM | Guter Startpunkt für Monster-Sculpting abseits von MakeHuman-Topologie | Direktdownload (.blend), Blender 3.2+ | 5/5 |
| Blender Studio „Realistic Human Base" (Projekt Heist) | **CC-BY** (nicht CC0!) – Attribution nötig | Komplettes, produktionsreifes männliches Basemesh | Hochwertige Referenz/Ausgangsbasis für Hauptfiguren | Direktdownload | 5/5 |
| TheBaseMesh.com | CC0 (laut Selbstbeschreibung „100% Free CC0 Assets") | Diverse Objekt-/Charakter-Basemeshes | Ergänzung, v.a. für Requisiten-Sculpting | Direktdownload | 3/5 |
| Sketchfab „creature-rigged"/„creature-monster"-Tags | **Gemischt, überwiegend nicht CC0** – auf Sketchfab dominieren Standard-Sketchfab-Lizenzen (nicht herunterladbar) oder CC-BY; einzelne CC0-Funde vorhanden (z.B. „CC0 – Free Rigged Character") | Fertige, teils bereits gerigte Kreaturen/Monster in realistischem Stil | Zeitersparnis für Fahrgäste/Hörer-Konzeptmodelle, aber jedes Modell einzeln auf „Downloadable"+Lizenz prüfen | Konto nötig, Qualität schwankt stark, Rigging oft nicht kompatibel mit unserem „game_engine"/Unreal-Mannequin-Skelett → Retargeting nötig | 3/5 (Streuung hoch) |
| Reallusion Character Creator / iClone (Trial/Free-Content) | **Kommerziell, kein Free-Commercial-Tier** – nur einzelne ActorCore-Freebies sind lizenzfrei nutzbar, die Software selbst kostet | Alternative Character-Pipeline | Für uns nicht relevant, da Budget=0 und MPFB2 bereits etabliert | – | – (kein Fit) |

**Kreatur-Workflow-Fazit:** Es gibt kein fertiges freies „Monster-Baukasten"-Tool in unserem Qualitätsanspruch (bezahlte Tools wie „Creature Kitbash", $45+, ausgeschlossen). Realistischer Weg bleibt: MPFB2-Basis → Sculpting mit Blender-Bordmitteln (Multires + Dyntopo) → ggf. Retopologie. Die o.g. CC0-Basemeshes von Blender Studio sind der beste kostenlose Startpunkt für Kreaturen-Sculpting, weil topologisch sauberer als MakeHuman-Export.

---

## 4. Animationen

| Quelle/Werkzeug | Lizenz | Was genau | Nutzen | Aufwand | Qualität |
|---|---|---|---|---|---|
| [CMU Graphics Lab Motion Capture Database](http://mocap.cs.cmu.edu/) | Frei nutzbar, auch kommerziell einbindbar; **Weiterverkauf der Rohdaten selbst (auch konvertiert) verboten**. Optionale Attribution empfohlen | >2.500 Bewegungssequenzen, 144 Probanden | Größte Ergänzung zur Quaternius-UAL für generische Bewegungen (Gehen, Rennen, Fallen) | FBX-Konvertierungen z.B. über HuggingFace/Academic-Torrents-Mirrors verfügbar, Rohformat (ASF/AMC) braucht Konverter | 3/5 (ältere Mocap-Qualität, aber ausreichend) |
| Bandai Namco Research Motiondataset | **CC BY-NC-ND 4.0 – NICHT kommerziell nutzbar** ohne Sondererlaubnis | 3000+ Moves (Gehen, Kämpfen, Tanzen), Blender-Importskript unter MIT | Nur für Prototyping/Referenz, **nicht fürs fertige Spiel** | – | „Lizenz unklar/ausgeschlossen für uns" |
| Adobe Mixamo | Kommerzielle Nutzung in fertigen Projekten (auch Spielen) erlaubt; **kein Weiterverkauf der Animationen/Charaktere als eigenständige Assets** | Riesige Auto-Rig-Bibliothek + Animationen | Bereits gängige Quelle, kompatibel mit UE-Mannequin-Bones ähnlich unserem Skelett | Kostenloses Adobe-Konto nötig, Sprachfunktion online (nicht lokal) | 5/5 |
| Reallusion ActorCore (Free-Tier) | Royalty-freie, aber **limitierte** kommerzielle Lizenz laut EULA – im Rahmen der Standardnutzung für Spiele ok | 3 Gratis-Charaktere + 32 Bewegungen bei Anmeldung, monatlich neue Freebies | Ergänzende, modernere Mocap-Moves speziell für Third-Person-Horror | Kostenloses Konto nötig | 4/5 |
| Rokoko Motion Library (kostenlose Clips) | Explizit für kommerzielle Projekte freigegeben | 150+ freie Mocap-Clips über Rokoko Studio (kostenlose Software) | Gute Ergänzung für spezifische Horror-Bewegungen (Schleichen, Zögern) | Rokoko-Studio-Installation + Konto | 4/5 |
| FreeMoCap | AGPL-3.0 (Software), erzeugte **eigene** Aufnahmen gehören dem Nutzer | Open-Source Markerless-Mocap mit normalen Kameras | Für eigene Referenz-Mocap-Sessions (z.B. Fahrgäste-Gang) ohne teures Suit | Setup-Aufwand hoch (Multi-Kamera-Kalibrierung, Python) | 3/5 (experimentell) |
| DeepMotion (Free-Tier) | **Free-Tier ausdrücklich NICHT kommerziell nutzbar**, nur mit „Studio"-Abo (49 $/Monat) kommerziell | Video-zu-3D-Mocap per KI | Nur zum Testen/Prototyping ohne Abo | 10 s Clip-Limit, Wasserzeichen im Gratis-Tier | „Lizenz unklar/kostenpflichtig für Produktion" |
| Plask (Free-Tier) | Lizenzbedingungen für kommerzielle Nutzung im Gratis-Tier **nicht eindeutig verifiziert** → als unklar markiert | Video-zu-3D-Mocap, 15 s/Tag im Gratis-Tier | Für kurze Referenz-Clips brauchbar | Tägliches Zeitlimit | „Lizenz unklar" |
| Move-AI (Free) | Nicht verifiziert (keine belastbaren Lizenzdetails gefunden) | Video-zu-3D-Mocap | – | – | „Lizenz unklar" |
| Rokoko Blender-Retargeting-Add-on | Kostenlos, Teil des freien Rokoko-Plugins | Animation-Retargeting in Blender | Einfaches Retargeting für Mixamo/CMU-Importe auf unser Rig | Plugin-Installation | 3/5 (laut Community schwächer als Alternativen) |
| Expy-Kit | Frei (Basisversion), Blender-Add-on | Retargeting Mixamo → Rigify, Batch-Verarbeitung mehrerer Animationen | Sehr nützlich, wenn wir Rigify für NPCs nutzen | Add-on-Installation | 4/5 |
| „Retarget"-Add-on (Fork aus Expy-Kit + Animaide) | Frei (Blender Extensions Plattform) | Presets für Mixamo/Unreal/VRoid/MMD/Daz/Auto-Rig-Pro | Direkter Ersatz für die kostenpflichtige „Auto-Rig Pro"-Retargeting-Funktion | Über extensions.blender.org installierbar | 4/5 |

---

## 5. Audio

| Quelle | Lizenz | Was genau | Nutzen | Aufwand | Qualität |
|---|---|---|---|---|---|
| [Sonniss GDC Game Audio Bundle](https://sonniss.com/gameaudiogdc/) | Eigene Lizenz (verifiziert): kommerziell frei nutzbar, **keine Attribution nötig**, aber **kein Weiterverkauf der Einzelsounds** und **KI-Training explizit verboten** | Jährlich neues, mehrere GB großes Bundle (2026: 7,47+ GB) von Profi-Soundfirmen (Boom Library, Krotos u.a.) | Ambiente/Industrie/Horror-SFX für Türen, Gitter, Maschinen, Schritte | Direktdownload der Jahresbundles (auch ältere Jahrgänge archiviert) | 5/5 |
| [Freesound.org](https://freesound.org/) (CC0-Filter) | Filterbar nach CC0 (dann attributionsfrei und kommerziell frei) – **Vorsicht:** Standard-Suche zeigt auch CC-BY/CC-BY-NC, explizit auf CC0 filtern | Große Nutzer-Sound-Datenbank, gut für spezifische einzelne Geräusche | Ergänzung/Lückenfüller zu Sonniss | Kostenloses Konto zum Download, jeden Treffer einzeln auf Lizenz prüfen | 3/5 (Qualität schwankt stark) |
| BBC Sound Effects Archive | Kostenlose Version nur unter „RemArc Licence" = **nicht kommerziell** (nur privat/Bildung/Forschung); kommerzielle Nutzung erfordert kostenpflichtige Lizenz über Pro Sound Effects | 16.000+ BBC-Archivaufnahmen | Für uns im Gratis-Zugang **nicht nutzbar im fertigen Spiel** | – | „Lizenz unklar/ausgeschlossen ohne Kauf" |
| Pixabay Sound Effects | Pixabay-Content-Lizenz: kommerziell frei, keine Attribution nötig, aber **kein Weiterverkauf der Rohsounds als eigenständige Datei** | Kuratierte SFX-Sammlung, gute Suchfunktion | Schnelle Ergänzung für einzelne fehlende Geräusche | Kein Konto nötig zum Anhören, Download ggf. mit Konto | 4/5 |

---

## 6. Werkzeuge für die three.js/glTF-Pipeline

| Werkzeug | Lizenz | Was genau | Nutzen für TIEFER | Aufwand |
|---|---|---|---|---|
| [gltf-transform](https://gltf-transform.dev/) | MIT (Open Source) | CLI/JS-API: Meshopt-Kompression, KTX2/Basis-Texturkompression (UASTC/ETC1S), Aufräumen/Pruning von glTF-Dateien | Direkt einsetzbar als Vorverarbeitungsschritt vor dem Ausliefern der neuen Poly-Haven/Fab-Modelle – passt zu „keine Build-Tools zur Laufzeit", da es ein Offline-CLI-Schritt ist | Node-CLI-Installation (`npm i -g @gltf-transform/cli`), kein Server-Impact |
| [gltfpack](https://meshoptimizer.org/gltf/) (Teil von meshoptimizer) | MIT | Kompaktere glb/gltf via Meshopt-Codecs, optionale Basis-Textur-Kompression | Alternative/Ergänzung zu gltf-transform, oft kleinere Ausgabedateien | Eigenständiges Binary, three.js unterstützt Meshopt-Decoder seit r122 (`GLTFLoader.setMeshoptDecoder`) |
| Blender-Bake-Workflow (Cycles → Lightmap-Texturen) | Blender selbst GPL, eigene Bakes gehören uns | Vorberechnete Beleuchtung/AO für statische Ebenenteile, dokumentierte Community-Skripte (z.B. Batch-Baking-Script im three.js-Forum) | Kann die dynamische Lichtpool-Last (`gfx/lightpool.js`) für rein statische Bereiche entlasten, ohne den Stil zu verändern | Erfordert UV2/Lightmap-UVs im Levelbau-Tool, zusätzlicher Bake-Schritt pro Level-Variante – bei prozeduraler Generierung (`levelgen.js`) nur bedingt sinnvoll (eher für Hub „Markt Neun", der handgebaut ist) |
| [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) | MIT | BVH-Beschleunigung für Raycasting/räumliche Abfragen | Potenziell schnellere Kollisionsabfragen/Sichtlinien als die aktuelle AABB-Hash-Lösung (`world/collision.js`), besonders bei komplexeren importierten Modellen | Bibliothek per Import-Map einbindbar, kein Build-Tool nötig |
| [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) | Zlib-artige Open-Source-Lizenz (frei, kommerziell nutzbar) | Modulare Post-Processing-Pipeline für three.js | Alternative/Ergänzung zum bestehenden eigenen Composer (Bloom/Grading/Korn) – ggf. nur einzelne Passes (z.B. SMAA) übernehmen, um die bestehende Pipeline nicht zu ersetzen | Per ESM-Import einbindbar |
| [N8AO](https://github.com/N8python/n8ao) | MIT | Hochwertiges Screen-Space-AO mit guter zeitlicher Stabilität, kompatibel mit pmndrs/postprocessing | Würde die Tiefenwirkung in engen Kabinen-/Kellerräumen verbessern, ohne High-End-GPU vorauszusetzen | Import + Integration in bestehende Composer-Kette |
| three.js `TiledLighting`/`ClusteredLighting` (WebGPU) | Teil von three.js selbst (MIT) | Effizientes Rendering vieler Lichter über WebGPURenderer | Erst relevant, sobald wir auf WebGPURenderer migrieren (laut Recherche wird das bis Ende 2026 stabilisiert); für aktuelles WebGL-Setup mit festem Lichtpool (`lightpool.js`) nicht akut nötig | Migrationsaufwand: eigenes `FinalShader`/Dithering-Postprocessing müsste auf WebGPU/TSL portiert werden – **größerer Umbau, nicht kurzfristig** |
| `three-good-godrays` / `three-volumetric-pass` | MIT (beide, Autor Ameobea) | Screen-Space-Godrays bzw. Raymarched-Volumetrics, kompatibel mit pmndrs/postprocessing | Passt gut zu Taschenlampen-Lichtkegeln und Neon-Atmosphäre, evtl. Ersatz/Ergänzung für die bestehende `gfx/particles.js`-Lichtkegel-Mesh-Lösung | Zusätzliche Abhängigkeit, Performance auf Low-End testen |
| `THREE.DecalGeometry` (offizielles three.js-Beispiel) | Teil von three.js (MIT) | Decal-Projektion auf beliebige Meshes | Für Blutspritzer, Kratzer, temporäre Schäden zur Laufzeit – ergänzt die bereits gebackenen ambientCG-Decal-Texturen | Bereits im three.js-Repo enthalten (`examples/jsm/geometries/DecalGeometry.js`), nur Import nötig |
| Needle Inspector (Chrome-Extension) | Kostenlose Basisfunktionen, „Pro" kostenpflichtig (einmalig) | three.js-Szenen-Inspektor/Debugger direkt im Browser, auch MCP-Anbindung | Gutes Debugging-Werkzeug während der Entwicklung, ersetzt keinen Level-Editor | Chrome-Extension-Install, Pro-Kauf nur bei Bedarf |
| three.js-eigener Online-Editor (`threejs.org/editor`) | Teil von three.js (MIT) | Einfacher visueller Szenen-Editor mit JSON-Export | Eher für schnelle Prop-Tests geeignet, kein Ersatz für unseren datengetriebenen Levelgenerator | Läuft im Browser, keine Installation |
| Chrome DevTools Performance-Panel + „Three.js DevTools"-Extension | Kostenlos | CPU/GPU-Frame-Profiling, Objekt-/Material-Inspektion | Direkt nutzbar zur Performance-Analyse der Composer-Pipeline auf Low-End-Hardware | Browser-Erweiterung installieren |

---

## 7. KI-Werkzeuge zur 3D-/Textur-Erzeugung

| Werkzeug | Lizenz | Was genau | Einschränkungen/Qualitätsgrenzen | Aufwand |
|---|---|---|---|---|
| **TRELLIS** (Microsoft) | **MIT** (verifiziert: uneingeschränkt kommerziell, keine Gebietssperre) | Bild/Text → 3D-Mesh-Generator, lokal lauffähig (GPU nötig) | Ergebnisse brauchen fast immer Nacharbeit (Retopo, saubere UVs, Materialtrennung) – für Hero-Assets ungeeignet, für schnelle Requisiten-Platzhalter/Sammelobjekte brauchbar | Lokale Installation (Python/ComfyUI), spürbare GPU-Anforderungen |
| **TripoSR** (Stability AI / Tripo AI) | **MIT** (verifiziert: „no territory clause, no user cap, no training restriction") | Einzelbild → 3D-Mesh, schnell, leichtgewichtig | Geometrie oft grob, Details nur angedeutet – eher für Blockout/Silhouetten als für finale Requisiten | Lokal lauffähig, moderate GPU-Anforderung |
| **Hunyuan3D 2.1** (Tencent) | ⚠️ **„Tencent Hunyuan 3D 2.1 Community License" – für uns NICHT nutzbar**: Lizenzgebiet schließt EU, UK und Südkorea ausdrücklich aus; zusätzlich Nutzungsgrenze bei >1 Mio. monatlich aktiven Nutzern und Verbot, Ausgaben zum Training anderer Modelle zu verwenden | Bild/Text → 3D, gilt qualitativ als eines der stärkeren offenen Modelle | **Wegen EU-Ausschluss für den Nutzer in Deutschland kommerziell nicht rechtssicher nutzbar** – trotz guter Qualität von der Liste streichen oder nur für private Tests ohne Veröffentlichung verwenden | – |
| KI-Textur-/Material-Generatoren (Pixelift, 3DTexel, Boracity u.a.) | Meist eigene Plattform-Lizenzen, die kommerzielle Nutzung der generierten Texturen erlauben, aber **Weiterverkauf der Rohtextur als Stock-Asset meist verboten** (z.B. 3DTexel-Lizenz) | Text/Bild → nahtlose PBR-Texturen | Qualität sehr wechselhaft, oft plastikhaft oder mit KI-Artefakten (Wiederholungsmuster, unsaubere Normal-Maps) – **nicht als Ersatz für ambientCG/Fab, nur als Lückenfüller für sehr spezifische Motive** | Meist Web-Tools mit Gratis-Kontingent, Konto nötig |

**Ehrliche Qualitätsgrenze insgesamt:** Keines der getesteten/recherchierten KI-3D-Tools liefert Sculpting-/Fotogrammetrie-Qualität für Hero-Requisiten oder Charaktere. Sie eignen sich am ehesten für schnelle Platzhalter, Beute-Kleinteile oder Konzept-Iteration – nicht als Ersatz für den bestehenden Poly-Haven/MPFB2/Fab-Workflow.

---

## Offene Punkte / „Lizenz unklar"

Folgende Quellen wurden genannt, aber die Lizenz für kommerzielle Spielenutzung war in der verfügbaren Zeit nicht abschließend verifizierbar – vor Nutzung selbst auf der jeweiligen Seite nachlesen:

- ShareTextures.com (PBR-Texturen)
- DeepMotion Free-Tier (kommerziell ausdrücklich ausgeschlossen laut Recherche, siehe Tabelle 4)
- Plask Free-Tier (Umfang der kommerziellen Nutzungsrechte im Gratis-Tier nicht eindeutig)
- Move-AI Free-Tier (keine belastbaren Lizenzangaben gefunden)
- Einzelne KI-Textur-Generatoren jenseits der oben genannten drei (viele neue Anbieter, Lizenztexte wechseln häufig)

---

## Quellen (Auswahl der direkt geprüften Seiten)

- ambientCG-Lizenz: https://docs.ambientcg.com/license/
- Sketchfab Download-API-Richtlinien: https://sketchfab.com/developers/download-api/guidelines
- Sonniss GDC-Bundle-Lizenz: https://sonniss.com/gdc-bundle-license/
- BlendKit/BlenderKit-Umbenennung: https://www.blendkit.com/news/goodbye-blenderkit-hello-blendkit/
- BlendKit-Lizenz-FAQ: https://www.blendkit.com/docs/licenses/licensing-faq/
- Tencent Hunyuan 3D 2.1 Lizenztext (GitHub): https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/blob/main/LICENSE
- CMU Motion Capture Database: https://mocap.cs.cmu.edu/
- Bandai Namco Motiondataset-Lizenz (GitHub): https://github.com/BandaiNamcoResearchInc/Bandai-Namco-Research-Motiondataset
- Smithsonian Open Access FAQ: https://www.si.edu/openaccess/faq
- Fab-Transition-FAQ: https://support.fab.com/s/article/Fab-Transition-FAQs
- Blender Studio Human Base Meshes: https://studio.blender.org/training/realistic-human-research/use-of-base-meshes/
- MPFB2-Ankündigung: https://www.cgchannel.com/2025/03/check-out-open-source-blender-character-generation-plugin-mpfb-2/
- gltf-transform: https://gltf-transform.dev/
- gltfpack/meshoptimizer: https://meshoptimizer.org/gltf/
- three-mesh-bvh: https://github.com/gkjohnson/three-mesh-bvh
- pmndrs/postprocessing: https://github.com/pmndrs/postprocessing
- N8AO: https://github.com/N8python/n8ao
- three-good-godrays: https://github.com/Ameobea/three-good-godrays
