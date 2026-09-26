# TIEFER — Game Design & Story-Bibel (v2 · Hybrid)

> *„Seil, halte. Rad, drehe. Bremse, greife.
> Kabine, trage uns nicht tiefer, als wir zu gehen bereit sind.“*
> — Litanei der Bruderschaft vom Seil

**Genre:** Koop-Bergungs-Horror mit Story-Kampagne (1–4 Spieler) · *Lethal Company* trifft Story-Game trifft Gothic-Cyberpunk
**Plattform:** Browser + Desktop (Electron → Steam) · **Spielzeit:** Kampagne ~4–6 h (sehr gute Spieler ≥ 3 h), danach Endlos-Modus
**Stil:** „Gothic Neon Lo-Fi“ – bleibt wie gebaut. Der Hub oben bekommt mehr Cyberpunk (Neon, Regen, Holo-Werbung, Drohnen, Prothesen, Schwarzmarkt).

---

## 0. Die Vision

Im **siebenten Jahrhundert nach der Flut** gibt es kein Land mehr, nur das schwarze Meer und die **Spindeln**, kilometerhohe Turmstädte. In der **Spindel des Erbauers** regiert eine Kirche, die lehrt: *Die Stimme ist die Seele.* Wer ihr seine Stimme zehntet, singt nach dem Tod im **Heiligen Chor**.

Doch der Zehnt bleibt aus. Die Menschen im Sockel verkaufen ihre Stimmen lieber an den Schwarzmarkt, die Stummen streiken, und heimlich **sinkt die Spindel**. Also öffnet die Hohe Kanzlei, was seit sechshundert Jahren versiegelt ist: **Schacht Null**. Unter der Stadt liegen die vergessenen Keller, das Salz, die Erinnerungen der Toten – voller Reliquien, Stimmwalzen und Messing.

Ihr seid eine **Bergungsmannschaft** der Bruderschaft vom Seil: verschuldete Schachtratten mit einem **Bergungsvertrag**. Ihr bekommt einen ausrangierten, entweihten Lastaufzug, **die Neunte**. Bringt jede Zehntwoche genug Bergegut für die **Quote** der Kanzlei nach oben. Schafft ihr es nicht, werdet ihr **„erwählt“**.

Oben liegt **Markt Neun**: Neon, Regen, Schwarzmarkt, Garküche, Werkstatt. Unten liegt, was zuhört.

**Kernschleife:** Oben ausrüsten → hinunterfahren → bergen, überleben, Aufträge erfüllen → vor **03:07** zurück in die Kabine → Beute verkaufen, Quote erfüllen, Aufzug ausbauen → tiefer.
**Thema:** Identität als Ware. Die Kirche oben und das Ding unten tun dasselbe, sie sammeln Stimmen. Und eure Beute für die Quote füttert beide.

---

## 1. Technik

| Entscheidung | Wahl | Begründung |
|---|---|---|
| Engine | **Three.js r186 (WebGL)** | Ich kann alles bauen *und selbst testen*; stilisierter Look spielt ihre Stärken aus. |
| Desktop/Steam | **Electron + steamworks.js** | `TIEFER.exe`, Errungenschaften, Overlay, Steam-Lobbys/P2P. |
| Mehrspieler | **Node + WebSocket**, austauschbarer Transport (WS / Steam) | Host-Autorität, Ebenen per Seed identisch. |
| Sprachchat | **WebRTC, räumlich** + Funkgeräte | Herzstück des Koop-Grusels; Monster hören mit. |
| Assets | **100 % prozedural** | Texturen, Modelle, Monster, Sounds, Musik per Code. |
| Stimmen | **Chatterbox Multilingual (MIT) offline** | Natürliche deutsche Neuro-Stimmen, im Spiel mit Telefon/Funk/Chor-Ketten bearbeitet. Männliche Stimmen geklont von Thorsten-Voice (CC0). Für Steam später durch Sprecher:innen ersetzbar. |
| Audio | **Web Audio API** | Synth-SFX, HRTF-3D, prozeduraler Hall, dynamische Musik. |

---

## 2. Grafikstil „Gothic Neon Lo-Fi“ (bleibt)

Niedrige interne Auflösung, Bayer-Dithering, Filmkorn, enge Bloom-Glanzlichter, Farbgrading pro Zone, Taschenlampe mit Reflektor-Lichtkegel, Kerzen gegen Natrium- und Neonlicht, prozedurale Texturen mit Relief. Hub: nasser Stein, Neonspiegelungen, Regen, Holo-Tafeln. Tiefe: pro Welt eigene Palette (Natriumorange, Archivgrün, Gold/Blutrot, Salzweiß, Unterwasser-Türkis, Sepia, Fleischrot, Knochenweiß).

---

## 3. Die Welt (Lore bleibt, siehe Kodex im Spiel)

### 3.1 Chronik (n. F. = nach der Flut)
| Jahr | Ereignis |
|---|---|
| 0 | **Die Flut.** Ilse Kessler (8) ertrinkt im Auto an der Hafenbrücke. |
| 1 | Konrad Kessler beginnt die Spindel auf dem Salzstock Morgenrot. |
| 3 | **Bohrung Null**: Hohlraum ohne Boden, Stimmen der Toten, 03:07. |
| 4–30 | Kirche der Ewigen Stimme. Margarete Wendt leiht ihre Stimme → **die Vermittlerin**. Brenner baut Schacht Null. |
| 33 | **Die Erste Fahrt**: Kessler und die Vierzig fahren „hinauf“. Seitdem: der Ruf alle 33 Jahre. |
| 33–593 | Krone und Sockel, Stimmzehnt, Stumme, Lotterien. Im Jahr 571 gründen die Stummen unterhalb der Kirche die Stille Gemeinde. |
| 580 | Großer Streik der Schachtratten: 11 Tage kein Zehnt. **Die Spindel sackt 4 cm ab.** Die Kanzlei erschrickt. |
| 593 | Kantorin Aksoy entdeckt „Quelle Null“. Kurz darauf wird sie beim Ruf „erwählt“. |
| **594** | **Heute.** Der Zehnt bricht ein. Die Kanzlei öffnet Schacht Null für **Bergungsverträge**. 46 Mannschaften sind schon hinabgefahren. Ihr seid **Mannschaft 47**. |

### 3.2 Fraktionen
**Kirche/Hohe Kanzlei** (kauft Beute, stellt die Quote, Geheimlehre „Statik“) · **Bruderschaft vom Seil** (eure Leute, Maschinenkult) · **Die Stummen / Stille Gemeinde** (Widerstand ohne Stimme) · **Voss' Schwarzmarkt** (Waffen, Stimmhandel, bessere Preise für Heißware) · **Haus Kessler** (Maske, Macht).

### 3.3 Das Wesen: DER CHOR
Ein Hunger unter dem Salz. Er sammelt Stimmen, Erinnerungen und Namen, spricht nur mit geliehenen Stimmen, kann nichts nehmen, nur **empfangen**, baut aus Erinnerungen Welten und **ruft um 03:07**. Das Tragseil der Neunten hält keine Kabine – *etwas hält das Seil*.

---

## 4. Figuren (Hub & Tiefe)

| Figur | Wo | Rolle |
|---|---|---|
| **Br. Dieter Kaltenbach** | Hub, Disposition | Alter Disponent mit Messinghand. Vergibt Aufträge, erklärt das Handwerk, flucht liebevoll. **Twist:** seit 612 tot – niemand außer euch redet mit ihm. |
| **Die Vermittlerin** | Kabinentelefon | Stimme der Kanzlei in eurer Kabine: Tutorial, Hinweise, Lob. **Maske des Chors.** Bietet „Gnaden“ gegen Buchstaben eures Namens. |
| **Das Rauschen** | Funk, Tiefe | Das echte Echo von Margarete Wendt. Warnt, wird klarer. |
| **Ada Brenner** | Hub, Werkstatt | Mechanikerin, Nachfahrin Brenners. Baut die Neunte aus. Hütet das Familienwort: *Das Seil hält nicht die Kabine.* |
| **Voss** | Hub, Schwarzmarkt | Stimmhändler. Waffen, Heißware, kauft Buchstaben eures Namens. Charmant, gefährlich, hat Schulden bei Dingen, die nicht bezahlt werden wollen. |
| **Kantor Veit XIX.** | Hub, Kantorei-Annahme | Kauft Bergegut, stellt die Quote, segnet. Glaubt jedes Wort, das er sagt. Wird mit der Story unruhig. |
| **Anselm** | Tiefe (−13), danach Hub | Stummer Koch der Vierzig. Nach dem Story-Auftrag −13 kommt er **mit nach oben** und eröffnet die Garküche. Tafelsprüche. |
| **Mutter Hanne & Jomo** | Hub, Stille Ecke | Die Stummen. Nebenquests, Kreide, Nias Funkgerät. |
| **Ilse – die Kleine Heilige** | Tiefe | Mädchen in Weiß. Führt euch zu Beute und Andenken. Schlüssel zum geheimen Ende. |
| **Konrad Kessler / der Portier** | Tiefe (ab −99) | Der Erbauer. Hält die Tür. |
| **Mannschaften 1–46** | Tiefe | Eure Vorgänger. Ihre Koms, Zettel, Leichen, Strichlisten erzählen 46 kleine Tragödien. |
| Margarete · Brenner · Aksoy · Oskar · Nia | Tiefe | Nebengeschichten über Dokumente, Tonwalzen, Erinnerungen. |

---

## 5. Spielstruktur

### 5.1 Zeit
- **Nacht = ein Abstieg.** Ankunft 00:00 auf dem Kom. Eine Spielminute ≈ 4 s (≈ 12,5 Min. real).
- **02:30** Die Vermittlerin mahnt. **02:50** Licht flackert, Monster werden unruhig. **03:00** Glockenschlag. **03:05** Die Kabine schließt in 60 s.
- **03:07 – DER RUF.** Die Fliehkraftbremse löst, die Neunte schießt nach oben. Wer draußen ist, bleibt beim Chor (tot, Beute verloren).
- **Zehntwoche = 3 Nächte.** Danach zieht die Kanzlei die **Quote** ein. Sie steigt jede Woche.
- **Quote verfehlt:** Schachtratte → „Erwählt“-Sequenz, Neustart der Woche (Verlust). Pilger → Schulden + zweite Chance. Erwählt-Schwierigkeit → Permadeath.

### 5.2 Der Hub: MARKT NEUN (Sockel, Etage 12)
Handgebauter Platz um den Schachtkopf der Neunten. Gotische Arkaden, Neon, Regen, Pfützen, Holo-Tafeln („Deine Stimme. Für immer.“), Drohnen, Dampf, Lautsprecher mit der Stimme der Vermittlerin.
| Ort | Funktion |
|---|---|
| **Disposition** (Dieter) | Auftragsbrett, Quote, Wochenplan, Tiefenwahl |
| **Kantorei-Annahme** (Veit) | Beute verkaufen (zählt zur Quote), Kirchenaufträge, Segen |
| **Voss' Stand** | Waffen, Heißware, +20 % für bestimmte Beute (zählt *nicht* zur Quote), Namens-Buchstaben verkaufen |
| **Adas Werkstatt** | Aufzug-Module, Seilstufen (Tiefenfreischaltung), Werkzeug-Upgrades |
| **Anselms Garküche** (ab Akt I-Ende) | Heilung, Mahlzeiten mit Boni für die nächste Nacht |
| **Kapelle der Kleinen Heiligen** | Andenken ablegen (geheimes Ende), Lore |
| **Stille Ecke** (Hanne, Jomo) | Nebenquests, Kreidetafel |
| **Quartier** | Speichern, Trophäen, Strichliste, Aussehen, Wochenende |

### 5.3 Die Neunte – ausbaubarer Lastaufzug
Die entweihte Heilige Kabine: altes Nussholz, Messing, Zifferblatt – überschraubt mit Stahlplatten, Lastnetzen, Haken. Innen 5 × 4 m, Scherengitter 3 m breit.
| Modul (Ada) | Wirkung |
|---|---|
| **Seilstufe II–VI** | Schaltet tiefere Tiefenstufen frei (Hauptprogression) |
| **Flutlicht** | Beleuchtet den Absatz – Fahrgäste erstarren im Licht |
| **Salzkanone** | Automatisches Geschütz am Gitter, braucht Salz |
| **Panzergitter I–II** | Monster brechen nicht ein |
| **Weihöl-Station** | Heilt in der Kabine |
| **Horchgerät** | Radarschirm: Monster & Crew im Umkreis |
| **Rufglocke** | Ruft die Crew zurück (laut!) |
| **Lastregal** | Mehr Stauraum, Beute wird sicher gezählt |
| **Notstrom** | Kabinenlicht bleibt bei Stromausfällen an |
| **Anselms Kessel** | Mahlzeit-Buff vor jedem Aussteigen |
| **Kosmetik** | Neon-Schriftzug, Lack, Radio, Plüsch-Heiliger |

### 5.4 Tiefenstufen
| Stufe | Tiefe | Welten | Monster | Story-Auftrag (golden) |
|---|---|---|---|---|
| I · Die Spindel | −2 … −17 | Ladebucht, Skriptorium, Beinhaus | Fahrgäste, Rattenschwärme | **−13 Saal der Vierzig**: Die Stimmreliquie bergen (Twist 1), Anselm kommt mit |
| II · Das Fundament | −21 … −48 | Bohrung Null, Zehntleitungen | + Hörer | **−33 Die Horchstation** reparieren → Erinnerung „Der erste Ton“ (Brenner) |
| III · Die Alte Stadt | −55 … −77 | Alte Stadt (Flut), Gerüst | + Ertrunkene | **−66 Das Archiv der Kantorin**: Margaretes Band, Aksoys Akten (Twist 2 & 3) → Erinnerung „Die Flut“ (Ilse) · **Entscheidung** |
| IV · Die Erinnerung | −88 … −111 | Haus des Erbauers, Kathedrale | + Portier, Nachsprecher | **−99 Das Haus**: Spieluhr, Strichliste der 46 Mannschaften (Twist 4 & 5) → Erinnerung „Die Vermittlung“ (Margarete) |
| V · Der Schlund | −222 … −333 | Schlund | alle | **−333**: Brenners Schere, Kesslers letzte Walze |
| VI · Der Chor | −666, −∞ | Das Innere, der Chor | – | **Finale** (Twist 6), drei Enden |

### 5.5 Eine Nacht
1. **Disposition:** 3–4 Aufträge wählen (Bergung, Spezialgut, Vermisst, Wartung, Kirchenauftrag, Schwarzmarkt, Story).
2. **Abfahrt:** Tiefe am Zifferblatt-Hebel einstellen, Fahrt mit Ereignissen, die Vermittlerin plaudert.
3. **Ankunft:** Stromausfall-Ritual, Tür auf, Kom-Uhr läuft.
4. **Bergen:** Beute (Gewicht, Wert), Aufträge, Nebengeschichten, Monster, Gefahren. Beute in die Kabine tragen, nur was drin ist, zählt.
5. **Rückkehr** vor 03:07 → **Abrechnung der Nacht** (Kirchenbuch-Stil): Beutewert, Verluste, Strafen, Quote.

### 5.6 Die Enden (bleiben, neu verankert)
- **A · VERMITTLERIN:** Namen geben → ihr werdet die Stimme. Epilog: Mannschaft 48 fährt hinab, das Telefon klingelt – mit euren Stimmen.
- **B · STILLE (wahr):** Brenners Schere, Seil kappen → der Chor verliert die Welt. Die Spindel sackt elf Meter, der Sockel läuft voll, 312 Tote – *mit Namen gezählt*. Die Kanzlei stürzt, die Stummen sprechen. Markt Neun steht halb unter Wasser, aber im Licht.
- **C · AUFWÄRTS (geheim):** 6 Andenken in der Kapelle + Ilses Lied im Finale → Ilse führt alle Echos die Treppe hinauf. Kessler lässt die Tür los. Epilog im Morgengrauen.
- Danach: **Endlos-Modus** („Nacht 48+“) in der veränderten Welt.

### 5.7 Die Plottwists (neu verankert)
1. **Die Reliquie ist leer** (−13): Die Stimme im Kabinentelefon kann nicht Margarete sein.
2. **Zwei Stimmen** (−66): Margaretes Band. Die Vermittlerin ist die Maske des Chors.
3. **Eure Quote füttert den Chor** (−66): Aksoys Akten + Frachtlisten: Alles, was ihr der Kantorei verkauft, geht nachts durch die Zehntleitungen nach unten. **Entscheidung:** Akten der Kanzlei zurückgeben (viel Geld, Stumme verfeindet) oder der Stillen Gemeinde für ihren Piratensender (Unruhen im Hub, Kantorei zahlt schlechter, Stumme helfen).
4. **Der Erbauer ist der Portier** (−99).
5. **Mannschaft 47** (−99): Die Strichliste zählt Mannschaften. Alle 46 vor euch wurden „erwählt“ – von derselben Disposition.
6. **Dieter ist tot** (−∞): In der Kabine von Mannschaft 46 sitzt Dieters Leiche. Er fuhr 612 hinunter, um sie zu holen. Der Chor hat sein Echo behalten und schickt über ihn neue Mannschaften. Nach dem Finale ist die Disposition leer. *Vorahnung:* Niemand im Hub redet mit Dieter, Anselm bedient ihn nicht, Voss fragt einmal: „Mit wem redest du da?“

### 5.8 Entscheidungen mit Folgen
Reliquie an Kanzlei oder Stumme · Namensbuchstaben an Voss/Vermittlerin verkaufen · Aksoys Akten · Oskars Laterne in die Kapelle · Jomos Funkgerät nach −666 · Anselms Rezepte → alles fließt in Epilog-Tafeln und den Endlos-Modus.

---

## 6. Gameplay-Systeme

- **Steuerung:** WASD · Maus · Shift · C · E · F Lampe · R kurbeln · Q scannen · LMB benutzen/schlagen/schießen · RMB Weihlicht/zielen · 1–4 Inventar · G fallen lassen · M Spieluhr · Tab Tagebuch · T Chat · V Funk/Sprechen · Esc.
- **Leben:** 100 LP. Fahrgast-Griff 40, Hörer-Biss 60, Portier = sofort. Weihöl, Verbände, Garküche heilen.
- **Tod:** Echo-Zuschauer; Wiederbelebung oben nach der Nacht gegen **Bestattungsgebühr**. Getragene Beute ist verloren.
- **Inventar:** 4 Plätze + „beide Hände“ für schwere Beute (kein Werkzeug, langsamer). Gewicht bremst.
- **Scannen (Q):** Kom zeigt Wert naher Beute (Lethal-Scan), Stufe II zeigt Monster.
- **Lärm & Licht:** wie geplant – Hörer hört, Fahrgäste frieren nur im Blick *und* Licht.
- **Waffen (Voss):** Brechstange · **Salzflinte** (2 Schuss, laut, zerschmettert Fahrgäste für eine Weile) · Schocklanze · Leuchtfackeln (werfbar, Fahrgäste erstarren) · Klapper (Köder) · Salzsäcke (Barriere) · Nagelmine.
- **Werkzeuge:** Kurbellampe (Upgrades) · Funkgerät · Kom-Scanner · Horchrohr · Kreide · Tragegurt · Bergehaken.
- **Gaben der Vermittlerin:** mächtige Boni gegen Buchstaben des Namens (bleibt als Kernmechanik; alle Buchstaben = Ende A erzwungen).
- **Wirtschaft:** gemeinsames Mannschaftskonto (Marken), Quote pro Woche, Preise schwanken mit Story-Entscheidungen.

### Monster
| Monster | Verhalten | Konter |
|---|---|---|
| **Fahrgäste** | Bewegen sich nur ungesehen/im Dunkeln | Hinsehen + Licht, Fackeln, Flutlicht, Salzflinte |
| **Rattenschwarm** | Messingäugige Ratten, fressen Kabel, beißen | Licht, Schlagen, Salz |
| **Der Hörer** | Blind, jagt Geräusche | Stille, Köder, Flinte (kurz) |
| **Ertrunkene** | Unter Wasser, packen Knöchel | Nicht im tiefen Wasser stehen bleiben |
| **Der Nachsprecher** | Ahmt Stimmen der Crew nach (Sprachchat-Schnipsel!) | Funk-Codewörter, Misstrauen |
| **Der Portier** | Unaufhaltsam, hält die Tür | Verstecken, Spieluhr |

---

## 7. Mehrspieler
1–4 · Raumcode (später Steam-Einladung) · gemeinsamer Hub · gemeinsames Konto · Host-Autorität · räumlicher Sprachchat + Funkgeräte · Echo-Modus · der Nachsprecher nutzt eure Stimmen.

## 8. Audio & Musik
Dynamische Musik (Hub-Thema mit Regen und Straßenmusik, Erkunden, Spannung, Jagd, Ruf-Countdown), Ilses Spieluhr als Leitmotiv, synthetisierte Geräuschwelt, vertonte Figuren (Dieter, Ada, Voss, Veit, Vermittlerin, Rauschen, Ilse, Kessler …).

## 9. UI
Warnhinweis → Studio → Helligkeit → Titel → Name & Schwierigkeit → **Tutorial-Nacht**. Hub-Panels (Auftragsbrett, Laden, Werkstatt mit Modulplätzen, Quote), Kom-HUD (Uhr, LP, Lampe, Inventar), Scan-Etiketten, Abrechnung der Nacht, Tagebuch/Kodex, Enden, Abspann mit Figurenschicksalen.

## 10. Architektur (Ziel)
```
server.js · START.bat · electron/ (später)
public/js/
  app.js                 Boot, Menüs, Modi
  core/                  settings, rng, input, bus, save (Kampagne)
  gfx/                   renderer, textures, materials, geo, particles, lightpool
  audio/                 audio, music, voice
  world/                 elevator (Lastkabine), hub, levelgen, levelbuild, themes, props, collision
  game/                  game (Modi Hub/Nacht), player (LP), inventory, items (Beute/Waffen),
                         contracts, economy, interact, director, monsters/
  story/                 lines, docs, codex, contracts-story, npc
  net/                   net, transport-ws, remote, voicechat
  ui/                    ui, menus, shop, board, report, journal
```

## 11. Umsetzungsphasen (Hybrid)
1. ✅ Fundament: Server, Renderer/Post-FX, Texturen, Materialien, Licht-Pool, Audio-Engine, Musik, Stimmen-Pipeline, Generator, Themen, Requisiten, Story-Texte
2. Lastkabine „Die Neunte“ (5×4 m, Module) + Generator auf 2×2-Kabine
3. Spielkern: Nacht-Uhr, LP, Inventar, Beute, Kabinen-Zählung, Abrechnung, Wirtschaft, Speichern
4. Hub „Markt Neun“ + Händler-UI + Auftragsbrett
5. Monster (Fahrgäste, Hörer, Ratten) + Waffen
6. Tutorial-Nacht + Tiefenstufe I inkl. Story-Auftrag −13
7. Mehrspieler + Sprachchat
8. Stufen II–VI, Story-Aufträge, Erinnerungen, Finale, Enden
9. Politur, Balancing, Electron/Steam-Vorbereitung

## 12. Veröffentlichung
Electron-Paket, steamworks.js (Errungenschaften, Rich Presence „Mannschaft 47 · −66 · 02:41“, Einladungen), Shoptexte, Trailer aus dem Spiel. Steamworks-Konto & Gebühr (100 $) durch dich; Testlauf auf itch.io möglich.
