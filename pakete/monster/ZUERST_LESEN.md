# Zuerst lesen – Übergabe an die KI zuhause

Dieser Ordner enthält **alle Änderungen vom 28.09.2026** (Cloud-Sitzung). Sie wurden auf einem älteren Stand des Spiels gebaut (`fbaf002`). Deshalb ist alles als eigenständiges Paket angelegt: nur neue Dateien, dazu zwei Zeilen in `game.js`.

## Was drin ist

| Datei | Inhalt |
|---|---|
| `LIESMICH.md` | Überblick: die sechs Wesen (Regeln, Konter) und die Segnung (7 Akte, Varianten, Folgen) |
| `EINBAU.md` | **Einbauanleitung**: Dateien kopieren, zwei Zeilen in `game.js`, Stimmen, alle Hüllen (Wrapper) und welche Spiel-APIs sie voraussetzen, Test-URLs, Stellschrauben, ein Sichtlinien-Fehler im Spiel (§10) |
| `MODELLE.md` | **Blender-Aufträge**: pro Wesen Modell-ID, Maße, Clips, was prozedural bleibt. Dazu die Segnungs-Figuren (Hochkantor, Büttel, Erwählte), neue Bauten (Rufkanzel, Glockenstuhl …) und Gegenstände (Spieluhr, Salzbrot) |
| `TESTS.md` | Testprotokoll aus der Cloud (was geprüft wurde, Ergebnisse, behobene Fehler) |
| `einbau-referenz.patch` | Die zwei Einbauzeilen als Git-Diff |
| `public/js/…` | Der Code (17 neue Dateien). Die Ordnerstruktur spiegelt `public/js/` des Spiels |

## Arbeitsauftrag (so an die KI geben)

1. `ZUERST_LESEN.md`, `LIESMICH.md` und `EINBAU.md` lesen.
2. `public/js/…` aus diesem Ordner in das Spiel kopieren (es wird nichts überschrieben) und die zwei Zeilen aus `EINBAU.md` §2 einbauen.
3. Die Hüllen in `pack.js` gegen den **aktuellen** Stand prüfen: `EINBAU.md` listet jede Funktion, die das Paket umhüllt, und jede API, auf die es sich verlässt. Wo sich zuhause Namen oder Abläufe geändert haben, die Hülle anpassen, nicht das Spiel.
4. Testen, mit den URLs aus `EINBAU.md` §6 (z. B. `?skip&night=ossuary&seed=7&monsters=portier`) und der Segnung (`EINBAU.md` §6: in der Konsole `g=__tiefer.game; g.state.sold=0; g.closeWeek()`).
5. `node tools/export-lines.mjs` um `PACK_LINES` ergänzen (`EINBAU.md` §3), dann die 97 neuen Zeilen lokal vertonen.
6. Modelle nach `MODELLE.md` in Blender bauen. Danach in `kit.js` die Schalter `FINAL.<wesen> = true` setzen (`EINBAU.md` §8). Dann lädt das Spiel das echte Modell statt des Platzhalters.

## Wichtig

- Die Wesen sind **fertig im Verhalten**. Die Figuren sind Platzhalter (vorhandene Modelle mit prozeduralen Zusätzen) und sehen noch nicht gut aus. Das Aussehen kommt mit den Modellen.
- Keine Stimmen in der Cloud erzeugt. Fehlt eine Datei, zeigt das Spiel nur Untertitel.
- Spielstand-Felder des Pakets beginnen mit `pk_` (in `state.flags`) bzw. `stats.segnungen`.
