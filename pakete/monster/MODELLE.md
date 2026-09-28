# Modelle für zuhause (Blender)

Der Code ist fertig. Es fehlen nur die Figuren und ein paar Bauten. Bis sie da sind, stehen vorhandene Figuren mit prozeduralen Zusätzen ein (`game/monsters/standin.js`). Die sehen absichtlich nur „ungefähr“ aus.

**Allgemein**
- Alle Figuren nutzen das Skelett **„game_engine“** (wie alle `npc_*.glb`). Dann laufen die Clips aus `anims_ge.glb`, und die Knochennamen stimmen (`pelvis spine_02 spine_03 neck_01 head upperarm_l/r lowerarm_l/r hand_l/r thigh_l/r calf_l/r`).
- Ausgabe: `public/assets/chars/npc_<id>.glb` (ids unten), gebaut wie die übrigen über `tools/blender/make_npcs.py`. Eigene Clips mit **genau den Namen** aus der Tabelle ins GLB backen, dann nimmt das Spiel sie statt der Standard-Clips.
- Danach in `public/js/game/monsters/kit.js` → `FINAL.<id> = true`.
- Die Körperprofile (`PACK_PROFILES` in `kit.js`) verzerren die Platzhalter (lange Arme usw.). Hat das Modell die Proportionen schon, dort die Werte abschwächen oder das Profil leeren.
- Stil: „Gothic Neon Lo-Fi“ – wenige, klare Formen, starke Silhouette, matte Stoffe, Messing glänzt, Haut fahl.

---

## 1. Die Falterin – `npc_falterin.glb`

Eine Sakristanin, sechzig Jahre Hüterin des Ewigen Lichts, zur Motte geworden. Größe 1,75 m, ausgezehrt, sehr lange dünne Arme und Finger, Kopf in den Nacken gelegt. Zerschlissenes liturgisches Gewand (Albe, grau-weiß, Saum in Fetzen), barfuß, die Füße hängen im Flug. Die Augen sind milchig und groß. Ein Halsband aus Kerzenwachs, auf der Brust ein Messingzifferblatt (Rest ihres Amtes).
- **Flügel**: Die prozeduralen Flügel aus Gesangbuchseiten (`standin.js` → `dressFalterin`) sind gut genug und **dürfen bleiben**. Alternativ zwei Flügelknochen `wing_l`/`wing_r` am `spine_03`. Dann `dressFalterin` für das echte Modell nur das Leuchten und den Staub behalten lassen.
- **Leuchten**: Im Brustkorb sitzt das gestohlene Licht. Material mit Emission im Bauch (Maske), das Spiel regelt die Stärke (0 … 1).

| Clip | Bedeutung | Platzhalter |
|---|---|---|
| `Swim_Idle_Loop` | Schweben (Beine hängen, Arme rudern leicht) | UAL Swim_Idle |
| `Swim_Fwd_Loop` | Flug vorwärts, Körper fast waagrecht | UAL Swim_Fwd |
| `Spell_Simple_Idle_Loop` | Trinken: Arme um die Lichtquelle gelegt | UAL |
| `Crouch_Idle_Loop` | Ruhen | UAL |
| `Death01` / `LayToIdle` | abgeschossen fallen / wieder aufstehen | UAL |

## 2. Der Zöllner – `npc_zoellner.glb`

Eintreiber der Hohen Kanzlei. 2,1 m, lang und gebeugt über seine Waage. Schwarze Soutane mit einer Reihe Messingknöpfe bis zum Boden, schwarze Handschuhe, ein Kragen aus steifem Papier (Quittungsrollen). Das Gesicht verdeckt ein **Zehnttrichter**: ein Messingtrichter vor Mund und Nase, dahinter Dunkel. Am Gürtel hängen ein Zollbuch an einer Kette und ein Glöckchen.
- **Requisiten** (eigene Meshes, am Knochen befestigt oder im GLB mitgeskinnt): Waage in der linken Hand (Balken, zwei Schalen an Kettchen, Zeiger), Siegelstempel in der rechten Hand (Holzgriff, Messinghals, Gummiplatte mit roter Tinte). Der Code bewegt die Waage bisher selbst (Pendel, Last). Kommt sie ins Modell, sollte `dressZoellner` sie auslassen, das Pendeln ist dann Aufgabe eines Knochens `scale_beam`.

| Clip | Bedeutung | Platzhalter |
|---|---|---|
| `Walk_Formal_Loop` | würdevoller Gang | UAL |
| `Idle_Lantern_Loop` | Waage vorstrecken (Forderung) | UAL (Laternenhaltung) |
| `Punch_Cross` | Stempelhieb | UAL |
| `PickUp_Table` | Herrenloses Gut aufheben | UAL |
| `Fixing_Kneeling` | Gewichte zusammensuchen (nach Salzschuss) | UAL |
| `Yes` / `Idle_No_Loop` | quittiert / verweigert | UAL |

## 3. Die Vorgänger – **kein neues Modell nötig**

Sie nutzen `npc_crew_m` / `npc_crew_f` mit einem Echo-Material (entsättigt, kaltes Blau, leicht durchscheinend). Schön wären Varianten der Mannschaftskleidung (andere Overalls, Helme mit Lampe, Rucksäcke, Seile). Das Nummernschild auf dem Rücken macht der Code. Clips: `Walk_Loop Walk_Carry_Loop Idle_Lantern_Loop Idle_Loop PickUp_Table Jog_Fwd_Loop Punch_Cross Crouch_Idle_Loop Idle_Talking_Loop`.

## 4. Die Ertrunkenen – `npc_ertrunkene.glb`

Opfer der Flut, meist Frauen und Kinder in der Kleidung der Alten Welt (Mantel, Sommerkleid, Schulranzen). Haut aufgedunsen, blau-grau und nass glänzend. Lange Haare, die im Wasser treiben (eigene Haarsträhnen mit Knochen oder Wellen-Shader). Finger zu lang. Algen und Schlamm am Saum. 1,6–1,7 m. Sie sind fast immer unter Wasser, zu sehen sind vor allem Gesicht, Hände und Haar.

| Clip | Bedeutung |
|---|---|
| `Swim_Idle_Loop` | treiben |
| `Swim_Fwd_Loop` | unter Wasser folgen |
| `Zombie_Scratch` | nach dem Knöchel greifen, ziehen |
| `Zombie_Idle_Loop` | am Ufer auftauchen |

Die Wasserfläche selbst ist Code (`flood.js`). Ein schöneres Wassermaterial (Normalen, leichte Tiefe, Kaustik) wäre ein Gewinn.

## 5. Der Nachsprecher – `npc_nachsprecher.glb`

**Zwei Gesichter in einem Modell.** Von weitem ein Mann der Bruderschaft im Overall mit Lampe, den Rücken zugewandt. Aus der Nähe: Der Hals ist zu lang (Knochen strecken sich per Profil), der Kopf dreht sich um 180°, und der Kiefer klappt bis zur Brust auf. Im Maul ein Ring aus Zähnen, dahinter viele kleine Münder. Die Haut unter dem Kragen ist gefaltet wie ein Balg.
- Wichtig: ein **Kiefer-Knochen** (`jaw`) oder Blendshape `mouth_open`. Das Spiel öffnet das Maul über einen Wert 0 … 1 (Platzhalter: schwarze Scheibe mit Zähnen, `dressNachsprecher`).

| Clip | Bedeutung |
|---|---|
| `Idle_Lantern_Loop` | Tarnung: steht mit Lampe |
| `Walk_Loop` | Tarnung: geht (nur ungesehen) |
| `Zombie_Idle_Loop` | Enthüllung (Kopf dreht sich) |
| `Sprint_Loop` | Jagd (schneller als der Spieler) |
| `Punch_Cross` | Zugriff |
| `Hit_Head` / `Death01` / `LayToIdle` | geblendet / umgeworfen / aufstehen |

## 6. Der Portier – `npc_portier.glb`

Konrad Kessler, der Erbauer (Twist 4 bei −99). 2,7 m, sehr aufrecht. Langer dunkler Portiersmantel mit zwei Reihen Messingknöpfen und Epauletten, weiße Handschuhe, Portiersmütze (dunkelrot, Messingband, Lederschirm). **Statt eines Kopfes ein halbrundes Zifferblatt aus Messing** (Skala 0 … 333, ∞ wie in der Neunten), dessen Nadel auf den Spieler zeigt.
- Das prozedurale Zifferblatt samt Nadel und Mütze (`dressPortier`) **darf bleiben**. Die Nadel wird vom Code gesteuert. Im Modell den Kopf weglassen und einen Anker `dial` am `neck_01` vorsehen.
- Die Handschuhe und der Mantelschoß sind im Platzhalter Grundformen, im Modell gehören sie echt dazu.

| Clip | Bedeutung |
|---|---|
| `Idle_Loop` | wacht |
| `Walk_Formal_Loop` | unaufhaltsamer Gang |
| `Crouch_Idle_Loop` | kniet und lauscht der Spieluhr (bitte ein echtes Knien mit gesenktem Zifferblatt) |
| `Zombie_Scratch` | greift zu (tödlich) |
| `Hit_Chest` | kurzes Stocken bei Treffern |

**Seine Tür / Loge**: Ist eine Sackgasse da, setzt der Code eine schwere Tür mit Messingschild „PORTIER“ und eine Portiersklingel auf ein Pult. Sonst entsteht eine **Portiersloge**: ein frei stehender Messingkäfig 2,3 × 2,3 m mit Gittertür, Pult, Schlüsselbrett und Schild „LOGE“. Beides wäre als Modell schöner (`portier_tuer.glb`, `portier_loge.glb`, Maße wie im Code in `portier.js`).

---

## Die Segnung – Figuren

### Der Hochkantor – `npc_hochkantor.glb`
Die Stimme der Hohen Kanzlei. Riesenhaft (2,3 m, auf verborgenen Stelzen) in weißem Chormantel mit Goldstickerei. Eine hohe weiße **Mitra**, vor dem Gesicht eine **goldene Maske** mit dem Zifferblatt-Symbol. In der rechten Hand ein **Sprechtrichter** aus Messing. Er spricht, der Trichter hebt sich.
Clips: `Idle_Loop`, `Walk_Formal_Loop`, `Idle_Talking_Loop` (große, feierliche Gesten).

### Die Büttel (Kantoren der Kanzlei) – `npc_buettel.glb`
Vier gleich, weiße Kutten mit Kapuze, das Gesicht mit einem weißen Tuch verhangen, silberne Gürtelkette. Jeder schwingt ein **Weihrauchfass** an drei Ketten (Rauch macht der Code).
Clips: `Idle_Loop`, `Walk_Formal_Loop`, `Interact` (nageln, zeigen). Ein Schwenk-Clip fürs Weihrauchfass wäre schön (`Censer_Loop`, dann im Code `b.opts` anpassen).

### Die Erwählten (Galerie im Schacht)
Weiße Gewänder, Kerze in der Hand, Nummernschild auf der Brust. Man kann das Büttel-Modell ohne Weihrauch nehmen (Code: `Galerie` in `segnung-bau.js`, Figur `stumm` mit weißem Material). Schön wäre Vielfalt: Männer, Frauen, ein Kind.

## Die Segnung – Bauten (Markt Neun)

Alle als Platzhalter in `story/segnung-bau.js` (Maße und Positionen dort). Am besten baut man sie **fest in den Markt** und lässt sie verhüllt, bis gesegnet wird.

| Bau | Ort | Beschreibung |
|---|---|---|
| **Rufkanzel** | am Schachtkopf über dem Portal, Plattform auf 6,1 m | Steinbalkon auf zwei Konsolen, Brüstung mit goldenem Kanzlei-Emblem, Messinggeländer, Baldachin aus weißem Tuch auf vier Messingstangen, zwei Kohlebecken. Darüber hängt im Dunkel ein **Messingkäfig** (Ø 1,25 m, 2,7 m hoch, Kuppel, Kette), in dem der Hochkantor herabfährt. |
| **Glockenstuhl** | vor dem Schachtkopf auf ~10,4 m | Holzjoch 7,4 m, drei Bronzeglocken (Ø 1,0 / 1,4 / 0,8 m), schwingen beim Läuten. |
| **Kerzenweg** | von der Kantorei zur Neunten | zwei Reihen hoher Wachskerzen auf dem Boden, besser in eisernen Bodenleuchtern |
| **Weiße Bahnen** | Schachtkopf und Arkaden | lange Tuchbahnen mit goldenem Zifferblatt und roter Stickerei, rollen sich ab |
| **Baldachin der Neunten** | über dem Absatz | vier Messingstangen, weißes Tuch |
| **Nachspuren** | danach | Wachsstümpfe, verlaufenes Wachs, Salz auf den Steinen, eine zerrissene Bahn, die **Strichliste der Disposition** (Kreide, 47 Striche), das Kanzleisiegel an der Quartierstür, der **Schuldbrief** (Papier, rotes Siegel, Nagel) |

## Gegenstände

| Id | Beschreibung |
|---|---|
| `spieluhr` | Messingkästchen (12 × 8 × 6 cm), Deckel mit Spiegel, auf dem Drehteller ein Mädchen in Weiß mit goldenem Punkt auf der Brust (Ilse), Kurbel an der Seite |
| `salzbrot` | runder, harter Laib mit Salzkruste (Anselms Gabe) |

Für beide: `TOOLS.<id>.model = '<modell-id>'` setzen (Modell-Manifest), dann entfallen die Grundform-Modelle aus `pack.js`/`musicbox.js`.
