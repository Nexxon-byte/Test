# Übergabe der Online-Sitzung → lokale Sitzung

Stand: 27.09.2026 · Branch `claude/sharp-clarke-xzck72` auf GitHub (Nexxon-byte/Test), aufgebaut direkt auf dem lokalen Stand `2e4e410` (Bundle).

## So holst du die Arbeit lokal ab
Der lokale Ordner hat die gleiche Historie bis `2e4e410`, die Cloud-Commits liegen obendrauf → ein schneller Vorlauf, kein Zusammenführen nötig:
```
git remote add origin https://github.com/Nexxon-byte/Test.git     # nur beim ersten Mal
git fetch origin claude/sharp-clarke-xzck72
git merge --ff-only origin/claude/sharp-clarke-xzck72
```
(Alternativ liegt ein Bundle mit nur den neuen Commits bei: `git pull TIEFER-cloud.bundle main`.)

## Fertig

### Sprint C – Monster, Gefahr, Waffen ✅
| Teil | Datei | Stand |
|---|---|---|
| Director | `game/monsters/director.js` | Spannung ruhig → unruhig (02:50) → Jagd (03:00), Spawnplan je Thema (`SPAWN_TABLE`, × Schwierigkeit), Licht-/Sichtprüfung (`lightAt`, `seen`, `canSeePoint`), Lärm-Ereignisse (`noise`, `loudestAt`), Treffer (`strike`), Salzlinien, Fackeln, Salzkanone (10 Schuss/Nacht), Horchgerät, Gitter (`gateHolds`, `forceGate`), erste Begegnung (`firstSight`), `debug()` |
| Grundklasse | `game/monsters/base.js` | Figur + `monsterize`, A* über das Raster mit Abkürzen, Kollision, Festhängen-Erkennung, Animation gedrosselt (fern/unsichtbar), `dressMonster` (Sackleinen statt weißem Sack) |
| Fahrgäste | `game/monsters/passenger.js` | bewegen sich nur ungesehen/im Dunkeln, erstarren im Blick+Licht (Mixer auf 0, Zuckungen halten), Fackel/Flutlicht bannen auch ohne Blick, Kopf folgt dem Spieler, Schlurfen/Knacken, Flüstern (`c_near_*`), Zugriff 40 LP → verschwinden und kommen wieder, Salzflinte/Kanone/Hammer zerschmettern (fallen, liegen, stehen **rückwärts** wieder auf), Brechstange schiebt nur. Tutorial: zahm (langsam, 20 LP) |
| Hörer | `game/monsters/listener.js` | blind, klickt (Echoortung), Atem in der Nähe, sucht (kriechend) / jagt (Sprint, Schrei) Geräusche, beißt nur bei Berührung (60 LP), flieht nach Treffern. Stille, Ducken, Klapper, Rufglocke wirken |
| Ratten | `game/monsters/rats.js` | `street_rat` instanziert, Messing-Glühaugen (blinzeln), Nest im Dunkeln, nagen Kabel (Leuchte flackert, nach 3 Bissen tot), Schwarm beißt (5 LP), flieht vor Licht (auch Lampe vor die Füße) und Salz, stirbt durch Schläge/Schüsse |
| Schrecken | `game/monsters/scares.js` | im Takt (ruhig 70–130 s, später 35–60 s), nie während Jagd: sterbende Lampe, Telefon klingelt (abheben → Chor/Rauschen), Schritte über der Decke, Flüstern hinter dir, Stroboskop, **Erscheinung** (sitzt/steht, wo eben niemand war – auf Stühlen, falls es welche gibt), **Gestalt hinter dem Scherengitter** |
| LP & Tod | `game/game.js` (`damage`, `heal`, `_die`) | roter Bildrand, Pochen bei < 40 LP, Kameraruck, Ohrenklingeln, Keuchen; Tod → Todeskarte (`DEATHS`), „Als Echo zusehen“ (Nacht läuft 15× schneller, Leertaste ruft die Neunte) oder sofort rufen; getragene Beute verloren, Bestattungsgebühr; oben heilt man langsam |
| Waffen | `game/tools.js`, `TOOLS` in `game/items.js` | Brechstange, Vorschlaghammer, Salzflinte (2 Schuss, R lädt, Patronen im Beutel), Leuchtfackel (45 s), Klapper (Köder, danach wieder aufhebbar), Salzsack (Linie), Verband (+35). Haltung in der Hand je Werkzeug (`view`), Streulicht der Lampe darauf |
| Läden | `ui/shop.js` | Voss verkauft alles oben (liefert in die Neunte), Salzpatronen ×4; Anselm: Kesselsuppe (heilt, +35 % Ausdauer nächste Nacht) |
| Kabine | – | Scherengitter nachts per E schließbar; ohne Panzergitter brechen Monster durch, I hält Fahrgäste, II auch den Hörer |
| Audio | `audio/audio.js` | neu: saltShot, shotgun, reload, swing, hitMetal, hitFlesh, bite, hurt, bandage, ratSqueak, ratScurry, fluorescentPing, flareIgnite, rattle, saltPour, Schleife flareBurn |
| Stimmen | `server.js`, `audio/voice.js` | Server listet vorhandene Stimmdateien, das Spiel lädt nur diese (keine 404, Untertitel bleiben) |

## Neue Sprechtext-IDs (bitte lokal vertonen)
| ID | Sprecher | Text |
|---|---|---|
| `v_hoerer_1` | vermittlerin | Leise jetzt, Seilkind. Dort unten ist jemand, der sehr gut hört. Ducken Sie sich. Und atmen Sie durch die Nase. |

`tools/tts/lines.json` ist schon neu exportiert.

## Wünsche an die lokale Sitzung
- **Fahrgast-Sack:** Das Modell hat für `bag_on_head` ein weißes Material ohne Textur – im Code wird es durch Sackleinen ersetzt (`dressMonster`). Schöner wäre eine echte Sacktextur mit Naht/Kordel im Modell.
- **Hörer:** läuft mit `monsterize('hoerer')`; Feinschliff (bleiche Haut) wie geplant lokal.
- **Werkzeug-Modelle:** Leuchtfackel ist die rot lackierte `stick_grenade` – eine echte Signalfackel (Papphülse, Zündkappe) wäre besser. Klapper, Salzsack, Verband sind Code-Geometrie.
- **Ego-Hände:** Werkzeuge schweben ohne Hand vor der Kamera – mit Ego-Armen (lokal geplant) an `inv.view` hängen.
- **Grafik-Endkontrolle mit GPU:** Blutrand-Stärke, Fackellicht (rot, 16 cd), Mündungsblitz, Rattenaugen, Streulicht auf Werkzeugen.
- **Ratten:** `street_rat` hat 14 k Dreiecke je Ratte – bei Leistungsproblemen eine vereinfachte Fassung erzeugen.

## Offen / bekannt
- Sandkasten (`?sandbox`) hat keine Monster – dafür gibt es `?skip&night=…` (siehe `docs/WERKZEUGE.md`).
- „Tür am Ende des Gangs steht plötzlich offen“: Die Ebenen haben keine Türen – kommt, sobald es Türen gibt.
- Das Thema `banquet` (mit Stühlen) ist in keiner Tiefenstufe eingetragen (`FLOORS`) – wird für −13 „Saal der Vierzig“ gebraucht (Sprint D).
