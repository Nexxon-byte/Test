# Einbau: Monster-Paket „Die Tiefe“ + Die Segnung

Für die KI zuhause. Dieses Paket wurde in der Cloud auf dem Stand `fbaf002` (Branch `claude/sharp-clarke-xzck72`) gebaut und dort im echten Spiel getestet. Zuhause ist der Stand neuer. Deshalb hängt sich das Paket fast nur über **Hüllen** (Wrapper) an und ändert keine bestehende Datei. Es fehlen nur die **Modelle** (siehe `MODELLE.md`). Bis sie da sind, stehen vorhandene Figuren mit prozeduralen Zusätzen ein.

## 1. Dateien kopieren

Der Ordner `pakete/monster/public/` spiegelt `public/`. Alles sind **neue** Dateien, es wird nichts überschrieben:

```
public/js/game/monsters/pack.js          Einstieg: installPack(game) – Spawns, Hüllen, Systeme
public/js/game/monsters/kit.js           Figurenwahl (FINAL/STANDIN), Körperprofile, erste Begegnung, Helfer
public/js/game/monsters/standin.js       Platzhalter-Ausstattung (Flügel, Waage, Zifferblatt-Kopf, Laternen …)
public/js/game/monsters/pack-ui.js       Bildschirm-Effekte, Anzeigen, Entscheidungs-Karte, Epilog-Tafeln (eigenes CSS)
public/js/game/monsters/falterin.js      Die Falterin
public/js/game/monsters/zoellner.js      Der Zöllner
public/js/game/monsters/vorgaenger.js    Die Vorgänger (EchoCrew + Mitglieder)
public/js/game/monsters/flood.js         Flutzonen (Wasser in der Ebene)
public/js/game/monsters/ertrunkene.js    Die Ertrunkenen
public/js/game/monsters/nachsprecher.js  Der Nachsprecher + Codewort/falsche Kom-Nachrichten
public/js/game/monsters/portier.js       Der Portier + seine Tür (oder Loge)
public/js/game/hiding.js                 Verstecke (Spinde, Beichtstühle) benutzbar
public/js/game/musicbox.js               Die Spieluhr (Werkzeug, Taste M)
public/js/audio/sfx-monster.js           neue Synth-Geräusche und Schleifen
public/js/story/lines-monster.js         alle Texte: Sprechzeilen, Kom, Kodex, Tode, Tipps, Codewörter
public/js/story/segnung.js               Die Segnung (Quote verfehlt) – Drehbuch
public/js/story/segnung-bau.js           Bauten der Segnung (Rufkanzel, Glockenstuhl, Kerzen, Galerie, Hände …)
```

## 2. Pflicht-Einbau (zwei Zeilen)

`public/js/game/game.js`:

```js
import { installPack } from './monsters/pack.js';
// … am Ende des Game-Konstruktors (nach Director, Tools, ContractRun, _wire…):
installPack(this);
```

Mehr ist nicht nötig. `einbau-referenz.patch` zeigt genau diese Änderung am Cloud-Stand.

## 3. Stimmen (Texte zum Vertonen)

Die Texte stehen in `story/lines-monster.js` (`PACK_LINES`, 97 Zeilen). Im Spiel hängt `installLines()` sie an `LINES`. Damit `tools/export-lines.mjs` sie mit ausgibt, dort ergänzen:

```js
import { PACK_LINES } from '../public/js/story/lines-monster.js';
// … Schleife über { ...LINES, ...PACK_LINES } statt nur LINES
```

`lines-monster.js` importiert nur reine Daten (`lines.js`, `codex.js`, `tips.js`) und lädt deshalb auch unter Node.

Neue Sprecher und passende Stimmreferenz (`tools/tts/gen_voices.py`):

| Sprecher | Wer | Stimme |
|---|---|---|
| `zoellner` | Der Zöllner | tiefer Mann, trocken, Beamtenton, langsam |
| `falterin` | Die Falterin | Frau, alt, Flüstern (Hall kommt vom Spiel) |
| `echo` | Vorgänger | wechselnd crew_m / crew_f, müde, gehetzt |
| `ertrunkene` | Ertrunkene | Frau/Mädchen, leise, nass (Filter macht das Spiel) |
| `buettel` | Kantoren der Kanzlei | Männerchor bzw. ein Mann (das Spiel verdoppelt als Chor) |
| `hochkantor` | Der Hochkantor | alter Mann, pathetisch, laut |
| `lautsprecher` | Lautsprecher im Markt | Stimme der Vermittlerin |
| `ns_dieter`, `ns_ada`, `ns_verm`, `ns_veit`, `ns_crew_m`, `ns_crew_f` | Nachsprecher | **exakt dieselben Stimmen** wie dieter, ada, vermittlerin, veit, crew_m, crew_f |

Die Portier-Zeilen (`p_*`) spricht `kessler`. Vor Kapitel −99 ist der Name im Untertitel „???“ (Flag `story99`).

## 4. Was die Hüllen tun

Alle in `pack.js` (Nummern wie im Code) und `segnung.js`. Wer lieber direkt im Code einbaut, kann jede Hülle durch die beschriebene Änderung ersetzen.

| Nr. | Hülle | Zweck | Direkt eingebaut wäre das … |
|---|---|---|---|
| 1 | `items.spawn` | Spieluhr/Salzbrot bekommen ihr Modell | `MODELS.spieluhr = buildMusicBoxModel`, `MODELS.salzbrot` in `items.js` |
| 2 | `inv._refresh` | dasselbe für die Hand | entfällt mit 1 |
| 3 | `director.preload` | Figuren der neuen Wesen mitladen | `MONSTER_CHARS` erweitern |
| 4 | `director.startNight` | Plan ergänzen, Wasser, Tür, Codewort, Verstecke | Aufruf am Ende von `startNight` |
| 5 | `director._spawn` | neue Arten erscheinen | Zweig in `_spawn` |
| 6 | `director.update` | Verstecke schützen vor Fahrgästen, Systeme takten, Taste M | Aufrufe vor/nach dem Monster-Takt |
| 7 | `director.clear` | aufräumen | Aufruf in `clear` |
| 8 | `director.loudestAt` | Gesiegelte sind lauter (×1,6) | Faktor in `loudestAt` |
| 9 | `director.addBarrier` | Salz im Wasser vertreibt Ertrunkene | Aufruf in `addBarrier` |
| 10 | `director._updateRadar` | **ersetzt**: fliegende/tauchende Wesen, Echos als „crew“ | `m.radar`/`m.radarKind` beachten |
| 11 | `director.debug` | zeigt `pack` | – |
| 12 | `game._die` | Todestexte der neuen Wesen | in `_die`: `DEATHS[kind] ? kind : …` |
| 13 | `game._pickup` / `_dropCurrent` | Vorgänger merken Diebe, Zöllner sammelt Fallengelassenes (`it.dropped`) | zwei Zeilen |
| 14 | `game._clockText` | Kom-Uhr zeigt nahe dem Portier 03:07 | – |
| 15 | `game.prewarm` | Shader der neuen Figuren vorkompilieren | in `prewarm` |
| 16 | `player.update` | Wasser bremst, man sinkt ein, Ertrunkene ziehen hinab; Szenen-Takt `_packTicks` | – |
| 17 | `tools.use` | Spieluhr (Linksklick) | `case 'musicbox'` |
| S1 | `game.closeWeek` | Quote verfehlt → Segnung statt Hinweis | – |
| S2 | `ui.toast` | den Standard-Hinweis der Kantorei dabei einmal verschlucken | – |
| S3 | `game.loadHub` | Nachspuren im Markt, Schuldbrief, offene Segnung nach Neuladen | – |
| S4 | `game._talk` / `_slate` | die Sätze danach (einmal je Figur) | – |

Tabellen, an die angehängt wird (nur neue Schlüssel): `LINES`, `CODEX`, `DEATHS`, `SPEAKERS`, `TIPS`, `QUOTES`, `PROFILES` (monsterize), `TOOLS` (items). Dazu kommt `audio.play`/`audio.loop` mit Rückfall auf die Paket-Geräusche.

## 5. Schnittstellen, auf die sich das Paket verlässt

Hat sich zuhause etwas davon geändert, die jeweilige Stelle anpassen. Das Paket nutzt sonst nichts.

- **Director**: `R col elev player game monsters swarms flares barriers level grid rng info state plan active phase diff spike enabled` · `spawnCell nearestFloor clearLine canSeePoint seen lightAt noise loudestAt blockedByBarrier hurt strike(→ m.hit) addBarrier`
- **Monster (base.js)**: Konstruktor `{char, profile, radius, height}`, `pos yaw root ch warp path pathI goal repathT stateT onScreen removed` · `setState onState place pathTo follow stepToward faceToward animate distTo chest sightPoints dispose`
- **Game**: `pool items inv interact tools player elev world mode busy clock time state nightInfo hp` · `_itemEntry _pickup _dropCurrent _die _clockText prewarm closeWeek loadHub _talk _slate _keepOnlyCabinItems _clearWorld _rideSound _wait _frameWait _updateKom _rebuildCabEntries damage`
- **Level/Grid**: `level.grid hides farCells center wallSlots surfaceFn theme.height reserved cellKey` · `grid.walkable isFloor isLanding isCabin dist idx cx cz block lineOfSight randomFloorCell w h room`
- **Elevator**: `contains gateOpen gateTarget openGate closeDoors lightMode light cabLight candlesLit floodOn setFlood powered hasModule modules setModule interactables ring phoneActive shake startRide stopRide state speed setNeedleDepth needleJitter setDisplay setShaftStyle shaftRig.segs onRideEvent`
- **Hub**: `npcs[id]` (NPC mit `ch root base`), `holoCanvas holoTex _drawHolo rainSpeed group isHub`
- **Player**: `pos yaw pitch eye noise lampOn lampLevel battery toggleLamp spot spotTarget stats hidden frozen lookLocked lookTarget lookSpeed slow surface speedNow moving sprinting dead forward teleport shake`
- **UI/Render/Audio**: `ui.komMessage toast hint hintDone clearHints setObjective showKom setPrompt doc` · `R.fx.letterbox glitchPulse flashPulse` · `voice.say({pos,label,interrupt,delay}) text sequence` · `audio.out osc filt env vca _ring _burst _thump noiseSrc now muffle loops` · `music.setZone('silence') duck musicBox`
- **Stand**: `flags letters name stats difficulty marks cargo week night sold quota modules` · `quotaFor nameWithLetters letterCount saveCampaign clearCampaign` · `unlockCodex` · `showSlate` · `withLoading`

## 6. Spielen & Testen

```
?skip&night=ossuary&seed=7&monsters=falterin          ein Monster sofort
?skip&night=dock&seed=5&monsters=zoellner,vorgaenger  mehrere
?skip&night=scriptorium&seed=7&monsters=ertrunkene     Wasser kommt automatisch mit
&flood                                                 Wasser auch ohne Ertrunkene
&clock=170                                             Uhr vorstellen (170 = 02:50, 180 = 03:00: Portier geht zur Neunten)
```

Ohne `monsters=` kommen die Wesen nach Tiefenstufe (`PACK_SPAWNS` in `pack.js`): II Zöllner/Vorgänger · III Falterin, Ertrunkene · IV Portier, Nachsprecher · V alle. In Bohrung Null (`mine`) ist der Zöllner immer da (Zehntleitungen).

Die Segnung testen: Im Markt bei Veit „Woche abrechnen“ mit zu wenig verkauft. Schneller geht es in der Konsole mit `g=__tiefer.game; g.state.sold=0; g.closeWeek()`. Die Variante hängt von der Schwierigkeit ab (`g.state.difficulty = 'ratte' | 'pilger' | 'erwaehlt'`).

Kopfloser Test (wie in der Cloud): Playwright + Swiftshader. `window.__tiefer.game.director.debug().pack` zeigt Zustand, Wasser, Tür, Codewort und alle neuen Wesen.

## 7. Feinabstimmung

Jede Monster-Datei hat oben eine Wertetabelle (`FALTERIN`, `ZOELLNER`, `VORGAENGER`, `ERTRUNKENE`, `NACHSPRECHER`, `PORTIER`, `FLOOD`, `MUSICBOX`, `SEGNUNG`) mit Tempo, Reichweiten, Schaden und Zeiten. Spawns stehen in `PACK_SPAWNS`/`PACK_THEME_SPAWNS`/`SPAWN_AT` (`pack.js`).

## 8. Wenn Modelle fertig sind

In `kit.js` → `FINAL.<art> = true`. Dann lädt das Spiel `assets/chars/npc_<art>.glb` statt des Platzhalters. `MODELLE.md` sagt je Monster, welche prozeduralen Teile bleiben (z. B. die Papierflügel der Falterin, das Zifferblatt des Portiers) und welche Clips das Modell mitbringen soll. Die Clip-Namen stehen oben in jeder Datei (`const CLIP = …`). Eigene Clips mit denselben Namen ins GLB backen, dann greifen sie automatisch.

## 9. Kleine Wünsche an zuhause (optional)

- **Voss verkauft die Spieluhr**: in `ui/shop.js` → `VOSS_SHOP` einen Eintrag `spieluhr` (Vorschlag 90 M). In Portier-Nächten liegt sonst immer eine in der Nähe des Absatzes.
- **Garküche**: `salzbrot` kann Anselm auch verkaufen (heilt wie ein Verband).
- **Hub fest ausbauen**: Rufkanzel und Glockenstuhl gehören eigentlich dauerhaft in den Markt (still, verhangen, bis gesegnet wird). Dann in `segnung.js` → `_stage()` nur noch einblenden statt bauen.
- **Tagebuch/Strichliste**: `state.stats.segnungen`, `state.flags.pk_tally` (47), `state.stats.zehnt` (dem Zöllner gezahlt) können ins Tagebuch.
- **Ende A**: `game.onEnding('vermittlerin')` wird aufgerufen, wenn kein Buchstabe mehr übrig ist. Gibt es das noch nicht, spielt das Paket einen eigenen Epilog und löscht den Stand.

## 10. Fund am Rande (Fehler im bestehenden Spiel)

`world/levelgen.js` → `Grid.lineOfSight`: Liegen Start und Ziel **exakt** auf derselben Zellgrenze senkrecht übereinander (z. B. beide bei x = 0,0, also genau in der Kabinenmitte), ist `dx = 0` und der DDA-Schritt geht trotzdem zuerst seitwärts in die Nachbarspalte. Die Sichtlinie ist dann fälschlich blockiert. Im Spiel tritt das selten auf, bei Teleports nach (0, …) aber sicher. Fix:

```js
let tmx = dx === 0 ? Infinity : (dx > 0 ? (cx + 1 - gx0) : (gx0 - cx)) * tdx;
let tmz = dz === 0 ? Infinity : (dz > 0 ? (cz + 1 - gz0) : (gz0 - cz)) * tdz;
```

Das Paket umgeht es (der Portier steht bei x = 0,07 statt 0).
