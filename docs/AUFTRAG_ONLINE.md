# Arbeitsauftrag für die Online-Sitzung (Stand 27.09.2026 abends)

Du arbeitest in einer Cloud-Umgebung **ohne Grafikkarte, ohne Blender, ohne Stimmen-Erzeugung**. Die lokale Sitzung auf Julians PC übernimmt Figuren/Kleidung (Blender + MakeHuman), Stimmen (Chatterbox) und die Grafik-Endkontrolle. Du baust alles, was **Code** ist – und davon fehlt noch extrem viel. Arbeite die Sprints der Reihe nach ab, so weit du kommst. Qualität vor Menge, aber das Spiel soll fertig werden.

**Zuerst lesen:** `CLAUDE.md` (Regeln, Stolperfallen), `docs/GAME_DESIGN.md` (Spezifikation v2 Hybrid), **`docs/WERKZEUGE.md`** (alle Werkzeuge & Code-Bausteine), `docs/RECHERCHE_WERKZEUGE.md` (geprüfte Asset-Quellen + Lizenzwarnungen). Antworten an Julian auf Deutsch, locker.

## Neu seit dem letzten Auftrag (lokal erledigt – nicht nochmal machen)
- **Oberstadt „Markt Neun“ neu gestaltet:** offener Hof statt Halle, Häuserzeilen aus dem Poly-Haven-Baukasten (`world/facade.js` → `buildRow`), Fenster mit Innenräumen (teils beleuchtet), Himmelskuppel mit Smog, Hochhaus-Silhouetten mit Warnlichtern, Schachtturm mit Krone, echte Straßen-/Wandlaternen, LED-Werbetafel mit Rahmen, Garküche mit Vordach, Zehntkabine (Glas + Münztelefon), Markise bei Voss, Tresen mit Füllungen, Kantorei/Kapelle mit Pfeilern und Gesimsen, Pfützen, **Regen nur zeitweise** (Wetter-Zyklus in `hub.update`).
- **Figuren neu eingekleidet** (Roben, Overalls, Zweireiher …) – `npc_*.glb`. Echte Taschenlampe in der Hand (`vintage_flashlight`, dunkel lackiert).
- **Erstes Monster-Modell:** `public/assets/chars/npc_hoerer.glb` (ausgemergelt, blind, Robe; Clip-Satz „monster“: Crouch_Idle_Loop, Crouch_Fwd_Loop, Sprint_Loop, Jog_Fwd_Loop, Walk_Loop, Idle_Loop, Zombie_*, Punch_Cross, Death01, Hit_Chest, Hit_Knockback, LayToIdle, Spell_Simple_Idle_Loop).
- **Monster-Verformung:** `gfx/monsterize.js` → `monsterize(character, 'hoerer'|'fahrgast')` streckt Glieder/Hals, krümmt den Rücken, lässt den Kopf zucken; jedes Frame nach `character.update(dt)` → `m.update(dt)`. Vorschau: `?viewer&set=npcs&only=hoerer&clips=Crouch_Fwd_Loop&monster=hoerer`.
- **Prüfwerkzeug:** `node tools/test/placecheck.mjs "skip"` meldet Schwebendes/Ineinandersteckendes (in der Cloud ggf. `channel: 'chrome'` → Chromium/Swiftshader anpassen). Bekannte Fehlalarme: Glas im Fensterrahmen, sich kreuzende Kabel, gewollte Gesimse, Figur ↔ eigenes Requisit. **Bekannter echter Fehler:** `props.js truck()` – Räder schweben 0,14 m.
- **Fahrstuhlfahrt** wurde (evtl. teilweise) überarbeitet – siehe Commit-Log/`world/elevator.js`; offene Punkte stehen im Commit.


## 0. Einrichtung
```
npm install
node server.js                      # http://localhost:3033   (?skip = ohne Vorspann)
node tools/test/check-levelgen.mjs  # Generator-Test
node tools/test/shot.mjs "<query>" <präfix> '<views-json>'   # Screenshots (Software-WebGL)
```
- Falls kein `.git` im Ordner ist: `git init`, alles committen als **„Basis: lokaler Stand be1ed81+Auftrag“**. Danach **ein Commit pro Sprint/Teilschritt** (Trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`), damit die lokale Sitzung deine Arbeit sauber übernehmen kann.
- `tools/test/eval.mjs` und `shot-local.mjs` nutzen lokales Chrome – in der Cloud stattdessen `shot.mjs` (Swiftshader). Spieler per JS steuern: `window.__tiefer.game.player.teleport(x, z, yaw, pitch)`; Titel überspringen: `g.titleMode = false` und `#title` ausblenden.

## 1. Harte Regeln
- **Nicht anfassen:** `public/assets/chars/*.glb` (Figuren werden lokal gebaut), `tools/blender/`, `tools/tts/`, `public/audio/voice/`. Keine Stimmen erzeugen, kein Browser-TTS.
- **Neue Sprechtexte:** in `story/lines.js` mit **neuen IDs** eintragen, danach `node tools/export-lines.mjs`. Ohne Audiodatei zeigt `voice.js` nur Untertitel – das ist in Ordnung, die lokale Sitzung vertont später. Liste neue IDs in der Übergabe.
- **Assets:** Alles Nötige liegt im Repo (Poly-Haven-Modelle/Texturen CC0, MakeHuman-Figuren CC0, Quaternius-Animationen CC0). Neue Downloads nur CC0/CC-BY und in `public/assets/CREDITS.md` eintragen. Keine fremden Marken.
- **Stil beibehalten:** Gothic Neon Lo-Fi (siehe CLAUDE.md). Grimdark-Ton, eigene Begriffe.
- dt immer `Math.max(0, Math.min(0.05, …))`. Keine Build-Tools, ES-Module, Kommentare/UI Deutsch, Bezeichner Englisch.

## 2. Was es schon gibt (kurz)
- **Spielkern:** `game/game.js` – Hub ⇄ Fahrt ⇄ Nacht (`descend`, `_startNight`, `_updateNight`, `ascend`, `closeWeek`), Uhr bis 03:07, Beute (`game/items.js`, 49 Typen, davon 34 echte Modelle), Inventar 4 + beide Hände, Scan (Q), Verkauf an der Waage, Quote/Zehntwoche, Abrechnung, Shops (`ui/shop.js`), Speichern (`game/state.js`). `this.hp` existiert, wird aber kaum benutzt.
- **Figuren:** `gfx/characters.js` (`preloadCharacters`, `new Character(id)`, `play(clip)`, `lookAt`, `update(dt)`), `world/npc.js` (`new NPC(char, {clip, prop, look})`). Hub-Besetzung in `world/hub.js` (`CAST`).
  - Figuren-IDs und ihre Clips:
    - `dieter ada voss veit anselm hanne jomo stumm` (Händler-Satz): Idle_Loop, Idle_Talking_Loop, Idle_FoldArms_Loop, Idle_Rail_Loop, Idle_Rail_Call, Idle_No_Loop, Yes, Interact, Idle_TalkingPhone_Loop, Walk_Loop, Walk_Formal_Loop, Sitting_Idle_Loop, Sitting_Talking_Loop, Fixing_Kneeling, Spell_Simple_Idle_Loop, Consume, PickUp_Table, Chest_Open, Idle_Lantern_Loop
    - `crew_m crew_f` (Mannschaft): Idle_Loop, Idle_Torch_Loop, Idle_Lantern_Loop, Walk_Loop, Jog_Fwd_Loop, Sprint_Loop, Crouch_Idle_Loop, Crouch_Fwd_Loop, Walk_Carry_Loop, Interact, PickUp_Table, OverhandThrow, Death01, Hit_Chest, Hit_Knockback, LayToIdle, Punch_Cross, Sword_Attack, Pistol_Idle_Loop, Pistol_Aim_Neutral, Pistol_Shoot, Yes, Idle_No_Loop, Sitting_Idle_Loop
    - `gast_m gast_f` (**Fahrgäste**, Anzug + Sack über dem Kopf): Zombie_Idle_Loop, Zombie_Walk_Fwd_Loop, Zombie_Scratch, Dance_Loop, Idle_Loop, Sitting_Idle_Loop, Death01, Punch_Cross, Crouch_Idle_Loop, Spell_Simple_Idle_Loop, Walk_Formal_Loop, Idle_FoldArms_Loop
  - Skelett „game_engine“ (pelvis, spine_01–03, neck_01, head, clavicle/upperarm/lowerarm/hand_l/_r, thigh/calf/foot/ball_l/_r). **Monster-Verformung zur Laufzeit ist erlaubt und erwünscht:** Knochen skalieren/verdrehen nach `mixer.update` (lange Arme, gestreckter Hals, schief hängender Kopf, zu viele Gelenkwinkel) – so entstehen aus Menschen unheimliche Wesen ohne Blender.
- **Modelle:** `gfx/models.js` (`cloneModel(id, {height})`, `ModelBatch` für viele statische Kopien). Gruppen `hub/prop/loot/tool`. Werkzeug-Modelle: sledgehammer_01, crowbar_01, stick_grenade, vintage_flashlight, bolt_cutters_01, machete, portable_searchlight, bolt_action_rifle_7_62, signal_flashlight, service_pistol, propane_torch, pipe_wrench. Tier: **street_rat** (Gruppe prop). Liste aller IDs: `public/assets/models/manifest.json`. Anschauen: `?viewer&set=models&group=tool`, Figuren: `?viewer&set=npcs&only=gast_m&clips=Zombie_Idle_Loop,Zombie_Walk_Fwd_Loop`.
- **Welt:** `world/levelgen.js` (Raster CS=2,5 m, A*, Sichtlinie), `world/levelbuild.js`, `world/themes.js` (dock, scriptorium, banquet, ossuary, mine = Platzhalter), `world/props.js`, `world/collision.js` (`los()`), `gfx/lightpool.js` (Leuchten mit Modi dying/strobe …), Kabine `world/elevator.js` + Module `world/cabin-modules.js` (Flutlicht, Salzkanone, Horchgerät mit `setRadarBlips`, Rufglocke …).
- **Audio:** `audio/audio.js` (`audio.play(id, {pos, vol})`, Loops, Monster-Geräusche sind schon als Synth da – prüfen/erweitern), `audio/music.js` (`setZone`, `setTension`), `audio/voice.js` (`voice.say(id, {pos})`, Bus-Events `voice:start/end`).

## 3. Sprints (in dieser Reihenfolge)

### Sprint C – Monster, Gefahr, Waffen (höchste Priorität – Julian vermisst das am meisten)
1. **`game/monsters/`**: `director.js` (Spannungskurve pro Nacht: ruhig → unruhig ab 02:50 → Jagd ab 03:00; Spawns je Tiefe/Thema aus der Tabelle in GAME_DESIGN §6; Scare-Takt ohne Jumpscare-Spam), `base.js` (Zustände idle/wander/stalk/hunt/attack/flee/freeze, Wegfindung über das Level-Raster mit A*, Sicht über `collision.los`, Gehör über Lärm-Ereignisse vom Spieler/Items/Glocke/Flinte).
2. **Fahrgäste** (`gast_m/gast_f` + `monsterize(ch, 'fahrgast')`): bewegen sich **nur, wenn sie niemand ansieht ODER sie im Dunkeln stehen** – im Blick *und* im Licht erstarren sie mitten in der Bewegung (`mixer.timeScale = 0`). Kommen bei jedem Wegsehen näher, Kopf ruckartig schief, stehen plötzlich im Kabinenspiegel oder hinter dem Scherengitter. Griff = 40 LP. Konter: Hinsehen + Lampe, Fackeln, Flutlicht, Salzflinte (zerschmettert sie für eine Weile).
3. **Der Hörer** (Modell `hoerer` fertig + `monsterize(ch, 'hoerer')`; Feinschliff am Modell macht die lokale Sitzung): blind, jagt Geräusche, kriecht (`Crouch_Fwd_Loop`), sprintet bei lautem Lärm (`Sprint_Loop`). Biss = 60 LP. Konter: Stille, Ducken, Klapper als Köder, Flinte (kurz). Ab Tiefenstufe II, als Test auch in −17.
4. **Rattenschwarm** (`street_rat`, InstancedMesh + Schwarmverhalten): messingfarbene Augen (Glüh-Sprites), fressen Kabel (Licht flackert), beißen (5 LP), fliehen vor Licht/Salz.
5. **LP & Tod**: `game/player.js`/`game.js` – Schaden mit Bildschirmrand-Blut, Kameraruck, Herzschlag, Keuchen; 0 LP → Tod: Echo-Zuschauer (`ui.setEcho`), Beute in der Hand verloren, Bestattungsgebühr oben. Heilung: Weihöl-Station, Verbände (neuer Gegenstand), Garküche.
6. **Waffen bei Voss** (Shop-Einträge „BALD“ entfernen): Brechstange (`crowbar_01`, Schlag, LMB), Salzflinte (`bolt_action_rifle_7_62` umgedeutet, 2 Schuss, laut, Nachladen), Leuchtfackel (werfbar, Fahrgäste erstarren im Umkreis, eigene Leuchte im Lichtpool), Klapper (Köder), Salzsack (Barriere), Vorschlaghammer (`sledgehammer_01`, langsam, stark). Ansichtsmodell in der Hand, Treffererkennung per Strahl, Geräusche, Munition im Inventar.
7. **Kabinen-Module wirklich wirksam machen:** Flutlicht lässt Fahrgäste auf dem Absatz erstarren, Salzkanone schießt automatisch, Panzergitter verhindert Einbruch, Horchgerät zeigt Monster (`setRadarBlips`), Rufglocke lockt den Hörer.
8. **Grusel-Ereignisse** (Director): sterbende Lampen, Telefon klingelt in der Kabine, Schritte über der Decke, Flüstern (vorhandene Zeilen in `lines.js`), Tür am Ende des Gangs steht plötzlich offen, Fahrgast sitzt auf einem Stuhl, der vorher leer war. Sparsam, gut getimt, mit Musik-Spannung (`music.setTension`).
Abnahme: In der Sandbox und im echten Spiel eine Nacht auf −2/−7/−17 spielbar, Monster sichtbar (Screenshots), keine Konsolenfehler, Framerate ok (Figuren weit weg nicht animieren).

### Sprint D – Story, Aufträge, Tutorial
1. **Aufträge** (`game/contracts.js`, Auftragsbrett in `ui/shop.js` → `openBoard`): 3–4 wählbare Aufträge pro Nacht (Bergung, Spezialgut, Vermisst, Wartung, Kirchenauftrag, Schwarzmarkt, Story) mit Zielen im Level (goldene Markierung, Kom-Hinweis), Belohnung in der Abrechnung.
2. **Tutorial-Nacht −2** mit der Vermittlerin (vorhandene `v_tut_*`-Zeilen), danach Tiefenstufe I frei.
3. **Story-Auftrag −13 „Saal der Vierzig“** als handgebauter Sonderraum (Twist 1: Reliquie leer), Anselm kommt danach in die Garküche (`state.flags.anselm`).
4. **Tagebuch (Tab):** Aufträge, Kodex (`story/codex.js`), gefundene Dokumente (`story/docs.js`), Strichliste der Nächte. `docs.js` an die Twists v2 anpassen (Mannschaft 47, Dieter tot – Vorahnungen).
5. **Gaben der Vermittlerin** gegen Buchstaben des Namens (`nameWithLetters` in `game/state.js`), Entscheidungen aus GAME_DESIGN §5.8 als Flags speichern.
6. **Dokumente/Notizen im Level** als Fundstücke (Papier-Modell + Lesefenster existiert: `ui` Dokumente).

### Sprint E – Mehrspieler (1–4, Koop ist zentral)
- `net/` (Client zum vorhandenen WebSocket-Relay in `server.js`), Koop-Menü statt Toast (Raum erstellen/beitreten per 4-Zeichen-Code), Host-Autorität.
- Mitspieler als Figuren `crew_m`/`crew_f` mit Walk/Jog/Sprint/Crouch/Idle je nach Bewegung, Lampe, getragene Beute.
- Synchron: Kabine (Tor, Hebel, Fahrt), Beute (aufheben/ablegen/zählen), Monster (Host rechnet), Uhr, Tod/Echo, gemeinsames Konto.
- Räumlicher Sprachchat per WebRTC (Signalisierung über den Server), Funkgerät-Effekt über die vorhandenen Stimm-Filterketten.
- Test mit zwei Headless-Browsern.

### Sprint F – Tiefenstufen II–III
- Thema `mine` fertig bauen (Bohrung Null, Salzstollen), Zehntleitungen, **Alte Stadt** (Flutwasser, Fassaden, Ertrunkene). Story −33 Horchstation, −66 Archiv der Kantorin (Twist 2+3, Entscheidung Akten).

### Sprint G – Tiefenstufen IV–VI, Finale
- Haus des Erbauers, Kathedrale, Schlund, der Chor. Portier (unaufhaltsam, hält Türen), Nachsprecher. Finale, drei Enden + Endlos-Modus, Abspann mit Figurenschicksalen.

### Sprint H – Politur & Veröffentlichung
- Einstellungen, Balancing (Quote, Preise, Spawns), Speicherstand robust, Leistung (Sichtweiten, Figuren-LOD/Update-Ausdünnung), Electron-Hülle + steamworks.js-Stub, Web-Testversion neu bauen (`node tools/build-web.mjs`).

## 4. Übergabe zurück
Am Ende (oder wenn das Guthaben knapp wird): `docs/UEBERGABE_ONLINE.md` schreiben – was fertig ist, was offen/kaputt ist, **neue Sprechtext-IDs** (für die lokale Vertonung), Wünsche an die lokale Sitzung (z. B. „Hörer braucht eigenes Modell“, „Fahrgast-Kleidung“). Dann den ganzen Ordner **inklusive `.git`** (ohne `node_modules`) als ZIP an Julian geben.

## 5. Aufgaben, die NUR lokal gehen (nicht selbst versuchen – in der Übergabe als Wunsch notieren)
- Neue Figuren/Kleidung/Monster-Modelle (Blender + MPFB): Portier, Ertrunkene, Nachsprecher, Fahrgast-Varianten, Ego-Arme/Hände.
- Stimmen für neue Sprechtexte (Chatterbox, lokal).
- Grafik-Endkontrolle mit echter GPU, Licht-Backen in Blender (Lightmaps für Hub/Kabine).
- Große Asset-Downloads, falls das Cloud-Netz Poly Haven/MakeHuman nicht erreicht.
