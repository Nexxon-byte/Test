# Testprotokoll (Cloud, 28.09.2026)

Getestet im echten Spiel (Stand `fbaf002` + zwei Einbauzeilen) mit Playwright und Software-WebGL (Swiftshader). Nachtabläufe liefen per Schritt-Takt (`game.update(0.05)` in Schleife), die Segnung in Echtzeit. Die Platzhalter-Figuren sind nur funktional, das Aussehen kommt mit den Modellen (`MODELLE.md`).

| Wesen / System | Geprüft | Ergebnis |
|---|---|---|
| Alle Wesen gleichzeitig | Erscheinen in Skriptorium und Ladebucht, Director-Takt | ohne Fehler, alle Zustände laufen |
| **Falterin** | Lampe an in 18 m Sicht → Jagd → Griff | nach ~7 s gepackt, Akku 0, Lampe aus, 25 Schaden, danach satt und fort |
| | Fackel 4 m neben ihr, Lampe aus | seek → feast → Fackel ausgetrunken, sie leuchtet voll (gespeichertes Licht 1,0) |
| **Zöllner** | Spieler trägt 170 M, Lampe an, 9 m entfernt | kommt heran, Forderung 15 M (10 %, auf 5 gerundet) |
| | Stück (40 M) auf die Waage | quittiert, geht seiner Wege |
| | Frist verstreichen lassen | Stempelhieb: Siegel + 20, danach Eintreiben: wertvollstes Stück + 30 |
| | Stück fallen lassen | holt es sich (Herrenloses Gut) |
| **Vorgänger** | Arbeit | wählen Ziel, heben auf, tragen zum Lager (3 alte Funde liegen dort) |
| | Ziel vor ihren Augen wegschnappen | Zorn → ein Zugriff (15), Stück zurück, wieder Kollegen |
| | Todesstunde (Uhr auf `endAt`) | verwirrt, verblassen, drei Marken mit Namen bleiben liegen, Lager herrenlos |
| **Flutzonen** | Dock, Skriptorium | Zone mit 20 Zellen (18 tief), Spieler: Tempo × 0,62, Kamera 0,3 m tiefer |
| **Ertrunkene** | im Tiefen stillstehen | nach ~1 s gepackt, Kamera sinkt, 7/s |
| | treten (Wert gesetzt) | losgetreten, sie zieht sich zurück |
| | nicht wehren | nach 6 s: +45, zusammen tödlich aus 86 LP (aus 100 LP knapp überlebbar) |
| | Salz ins Wasser | Zone brennt 60 s, sie flieht |
| **Nachsprecher** | 45 s in 14 m Entfernung | ruft räumlich: `ns_verm_1`, `ns_veit_1`, `ns_dieter_2` |
| | auf 2,2 m heran | Enthüllung → Jagd → Treffer 45, kennt danach den Namen |
| | Stille (Lampe aus, still, 8 m) | zieht nach 8 s weiter |
| | Kom | echtes Codewort bei 00:12 / 01:03 / 02:23, falsche Nachricht mit falschem Codewort (WACHS-VIER statt WACHS-ZWÖLF) |
| **Portier** | Tür/Loge | Ossuarium: echte Tür vor Sackgasse · Dock/Skriptorium (keine Sackgasse): Portiersloge |
| | Spieler mit Lampe nah | begleitet → Berührung → tot |
| | Spieluhr (schon beim Aufziehen) | kniet, lauscht, kehrt danach an den Posten zurück |
| | Versteck, nicht gesehen | verliert die Spur, geht zurück |
| | Uhr 03:00 | geht von der Loge (45 m) zur Neunten und hält dort die Tür, holt wer nah kommt |
| Befreiungshilfe | Wesen klemmt zwischen Kisten und Säule | sucht einen Umweg, kommt an |
| **Segnung** (Schachtratte) | Woche mit 120/320 M abrechnen | Folgen sofort gespeichert (Marken 220 → 110, Beute weg, Nacht 0, `pk_segnungPending`), Kantorei-Fenster schließt, Szene startet |
| | Akte I–III | Veits Urteil, Glocken, Rückzug auf den Platz, Käfig mit Hochkantor fährt herab, Büttel in Weiß, Schleier, Kerzen, Anselm gibt das Salzbrot (liegt danach im Inventar) |
| | Akte V–VII | Fahrt hinab bis ∞, Hände und Gesichter am Gitter, Telefon, Entscheidungs-Karte („JULIAN_ → JUL_AN_“), Klick „geben“ → Buchstaben 1 → 2, Fahrt hinauf, Markt lädt, Dieter „Das kommt eigentlich nie vor“, Strichliste 47, `segnungen` 1, Steuerung zurück |
| | Dauer | im Spiel etwa 3½ Minuten (unter Software-Grafik im Test ein Vielfaches, weil der Markt dort nur etwa 1 Bild/s schafft) |

**Gefundene und behobene Fehler** (alle im Paket, bis auf den letzten):
- Die Tür überschrieb ihre eigene Prüf-Funktion.
- Die Vorgänger griffen zu dritt tödlich zu.
- Der Zöllner sah Spieler mit brennender Lampe nicht.
- Der Portier pendelte vor der Kabine.
- Zu breiter Kollisionskreis.
- Die Segnung konnte an Requisiten hängen bleiben (jetzt ohne Kollision und mit Zeitgrenzen).
- Sichtlinien-Fehler im Raster des Spiels bei x = 0 (EINBAU.md §10).
