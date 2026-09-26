// TIEFER – Dokumente. Platzhalter: {name} {NAME} {initial} {tally}
// Stil: note (Schreibmaschine) · hand (Handschrift) · church (Kirchenschrift) · terminal (Phosphor)
//       chalk (Kreide der Stummen) · tape (Tonwalze, ggf. vertont über voice-IDs) · child (Kinderschrift)
// chain: gehört zu einer Nebengeschichte (Zähler im Tagebuch)

export const DOCS = {

  // ======================================================================= PROLOG
  d_auftrag: {
    title: 'Dienstauftrag Nr. 0907', style: 'terminal', meta: 'BRUDERSCHAFT VOM SEIL · DISPOSITION SOCKEL-OST',
    text: `AUFTRAG:     NOTRUF SCHACHT NULL
KABINE:      9 (HEILIG · VERSIEGELT)
ZEIT:        03:07
MELDUNG:     PERSON EINGESCHLOSSEN. STIMME WEINT.
ZUSTÄNDIG:   {NAME}, SEILKIND, NIEDERSTE WEIHE

HINWEIS DER DISPOSITION:
Kabine 9 darf nur von Geweihten berührt werden.
Du bist geweiht. Knapp, aber geweiht.
Morgen ist der Achtzehnte Ruf. Wenn die Kanzlei
erfährt, dass jemand in der Heiligen Kabine sitzt,
fliegen Köpfe. Deiner zuerst, meiner gleich danach.
Hol die Person raus. Frag nichts. Schreib nichts auf.

Weiheschlüssel liegt im Wachhäuschen.
Möge das Seil dich halten.
                                    – Br. Dieter`,
  },

  d_wachbuch: {
    title: 'Wachbuch der Transithalle', style: 'hand', meta: 'Nachtwache O. Pohl · ab 594 n. F.', chain: 'oskar',
    text: `594, Nacht des Achtzehnten Rufs.
Die Schachtratte, die sie runtergeschickt haben, ist nicht zurückgekommen. Ab heute Nachtdienst: Pohl, O.

595. 03:07 Ruf aus Kabine Neun. Nicht abgenommen. Vorschrift.
596. 03:07. Nicht abgenommen.
601. 03:07. Ich habe angefangen, Gedichte zu schreiben. Die Nächte sind lang.
608. 03:07. Das Klingeln klingt jetzt anders. Weicher.
612. Br. Dieter ist gestorben. Er hat bis zuletzt gefragt, ob sich die Neun gemeldet hat.
619. 03:07. Ich habe die Hand auf dem Hörer gehabt. Zwölf Minuten.
626. 03:07. Ich habe abgenommen.

Da war jemand. Jemand hat geweint und gesagt: „Ich bin in der Kabine eingeschlossen. Bitte. Ich weiß nicht mehr, wie ich heiße.“

Ich gehe runter. Heute gehe ich ran.`,
  },

  d_katechismus: {
    title: 'Katechismus der Ewigen Stimme', style: 'church', meta: 'Tafel an der Säule · Verse I–VII',
    text: `I.   Die Stimme ist die Seele, die man hören kann.
II.  Wer seine Stimme gibt, wird im Heiligen Chor singen.
III. Der Erbauer fuhr hinauf, und die Vierzig mit ihm.
IV.  Alle dreiunddreißig Jahre öffnet sich die Neunte Kabine
     und nimmt die Erwählten auf.
V.   Wer schweigt, sündigt nicht. Wer spricht, gehört.
VI.  Die Nadel zeigt den Weg. Frage nicht, wohin.
VII. Oben ist Gnade. Unten ist Arbeit.

Gezeichnet im Namen der Hohen Kanzlei.`,
  },

  d_neunerspiel: {
    title: 'Kreide auf dem Boden', style: 'chalk', meta: 'Kinderschrift, halb verwischt', chain: 'nia',
    text: `DAS NEUNERSPIEL
steig allein in aufzug 4
drück 4 · 2 · 6 · 2 · 10 · 5
wenn auf 5 eine frau einsteigt
SPRICH NICHT MIT IHR
drück 1. wenn er nach unten fährt, hast du gewonnen

– NIA + JOMO WAREN HIER –`,
  },

  d_zehntkabine: {
    title: 'Zehntkabine 3', style: 'terminal', meta: 'Bildschirm, flimmernd',
    text: `WILLKOMMEN, GLÄUBIGE SEELE.
IHR STIMMZEHNT FÜR DIESEN MONAT IST FÄLLIG.

BITTE SPRECHEN SIE DEUTLICH IHREN NAMEN
IN DAS GITTER.

...

WIR HABEN SIE NICHT VERSTANDEN.
BITTE SPRECHEN SIE IHREN NAMEN.

...

BITTE.`,
  },

  // ======================================================================= −2 LADEBUCHT
  d_proklamation: {
    title: 'Proklamation zum Achtzehnten Ruf', style: 'church', meta: 'Gedruckt auf Zehntpapier · 594 n. F.',
    text: `Gläubige der Spindel!

In der Nacht zum dritten November öffnet sich die Neunte Kabine zum achtzehnten Mal seit der Ersten Fahrt.

Die Lotterie der Kanzlei hat dreiunddreißig Seelen erwählt. Ihre Namen werden in allen Aufzügen verlesen.

Die Erwählten kleiden sich in Weiß. Sie sprechen am Vorabend mit niemandem. Sie verabschieden sich nicht, denn sie gehen nicht fort. Sie gehen hinauf.

Den Familien der Erwählten wird der Stimmzehnt auf Lebenszeit erlassen.

Freuet euch.`,
  },

  d_voss_1: {
    title: 'Kassenbuch – Voss, Stimmankauf', style: 'hand', meta: 'Fettflecken, enge Schrift', chain: 'voss',
    text: `Sockel 12, Stand 44 – „Bargeld sofort“

Nr. 4471 · Frau, ca. 34 · schöne tiefe Stimme · 80 Rationen
Nr. 4472 · Mann, 60 · heiser · 12 Rationen (hat geweint, gab trotzdem)
Nr. 4473 · Kind, 11 · !! · 140 Rationen · Vater hat unterschrieben
Nr. 4474 · Mann, 22 · Schachtratte · will Prothese kaufen · 55 Rationen

Abholung durch die Kantorei: Dienstag.
Abholung „zur Tiefe“: Donnerstag. Nur die, die gar nichts mehr sprechen können.
Die zahlen besser. Frag nicht, wer.`,
  },

  d_ladeliste: {
    title: 'Frachtliste Ladebucht 2', style: 'terminal', meta: 'Drohnen-Disposition · automatisch',
    text: `LIEFERUNG 0-2211   ZIEL: SCHACHT NULL / UNTERSTE EBENE
INHALT: 12 EINHEITEN  "STUMM"  UNBESCHRIFTET
BESTÄTIGT: KANTOREI  /  ÜBERGABE: VOSS

LIEFERUNG 0-2212   ZIEL: SCHACHT NULL / UNTERSTE EBENE
INHALT: 9 EINHEITEN  "STUMM"
FEHLER: EMPFÄNGER UNBEKANNT
FEHLER: EMPFÄNGER UNBEKANNT
FEHLER: EMPFÄNGER ANTWORTET

LIEFERUNG 0-2213   STORNIERT.  GRUND: "ZU LAUT"`,
  },

  d_flugblatt: {
    title: 'Flugblatt der Schachtratten', style: 'note', meta: 'Illegal gedruckt, zerknittert',
    text: `BRÜDER! SCHWESTERN! SEILKINDER!

Wir halten die Stadt oben. Zwölfhundert Aufzüge, dreihundertdreiunddreißig Etagen, und jede einzelne Kabine fährt, weil einer von uns um drei Uhr nachts im Schacht hängt.

Und was bekommen wir? Den niedrigsten Weihegrad. Die Messinghand, wenn wir die eigene verlieren. Und am Ende einen Platz im Beinhaus, zwei Etagen unter den Toten der Krone.

Die Kanzlei sagt: Oben ist Gnade. Unten ist Arbeit.
Wir sagen: Ohne unten gibt es kein oben.

Streik am Tag nach dem Ruf. Sagt es weiter. Aber nicht in Aufzügen.
Die Aufzüge hören zu.`,
  },

  // ======================================================================= −7 SKRIPTORIUM
  d_fahrgastliste: {
    title: 'Die Liste der Vierzig', style: 'church', meta: 'Abschrift, Kantorei des Zehnts, Archiv I', chain: 'vierzig',
    text: `Die Getreuen der Ersten Fahrt, 33 n. F.

 1 Konrad Kessler, der Erbauer        21 Ruth Engel, Gärtnerin der Krone
 2 Hans Brenner, Chefingenieur        22 Pawel Nowak, Glaser
 3 Theodor Veit, Kantor                23 Jana Seidel, Schreiberin
 4 Mira Albers, Näherin                24 Konstantin Arp, Dachdecker
 5 Tobias Haag, Monteur                25 Gertrud Mahn, Hebamme
 6 Anselm Gruber, Koch                 26 Emil Stroh, Pförtner
 7 Finn Lodde, Lehrling                27 Rosa Keil, Lehrerin
 8 Selma Wirth, Sängerin               28 Aaron Bach, Uhrmacher
 9 Elias Dorn, Chorknabe               29 Hilde Brandt, Wäscherin
10 Jakob Maas, Schmied                 30 Leo Fink, Bote
11 Martha Pütz, Köchin                 31 Irma Holt, Pflegerin
12 Karl Wendel, Wächter                32 Ben Adler, Maurer
13 Luise Ebert, Weberin                33 Frieda Lang, Blumenbinderin
14 Otto Brand, Heizer                   34 Paul Ried, Fährmann
15 Clara Nies, Organistin              35 Sophie Kahl, Buchbinderin
16 August Lenz, Zimmermann             36 Wilhelm Roth, Seiler
17 Greta Voss, Wirtin                   37 Agnes Brück, Kinderfrau
18 Moritz Hahn, Fischer                38 Julius Stamm, Elektriker
19 Berta Kuhn, Magd                     39 Ida Moor, Waise
20 Simon Falk, Sprengmeister           40 Lorenz Hart, Kutscher

Handschriftlich nachgetragen, andere Tinte:
41 Margarete Wendt, Telefonistin`,
  },

  d_brenner_log_1: {
    title: 'Technisches Logbuch – Schacht Null', style: 'note', meta: 'H. Brenner · Blatt 14', chain: 'brenner',
    text: `28 n. F.

Kabine 9 ist fertig. Ich habe noch nie eine so schöne Kabine gebaut und noch nie eine, vor der ich mich so gefürchtet habe.

Seil: 9-litzig, geweiht. Länge: unbekannt. Ich schreibe das hin, weil es stimmt. Wir haben 4.000 Meter abgerollt und das Seil hängt noch immer straff, als würde unten jemand ziehen.

Gegengewicht: keins. Kessler sagt, es braucht keins.
Er hat recht. Die Kabine hält von selbst. Das ist das Schlimmste.

Anzeige: Kessler wollte ein Zifferblatt ohne Minuszeichen. „Die Leute sollen glauben, was sie glauben wollen.“`,
  },

  d_aksoy_1: {
    title: 'Memo – Kantorin S. Aksoy', style: 'terminal', meta: 'Stimmarchiv · intern · 581 n. F.', chain: 'aksoy',
    text: `AN:     OBERKANTOR VEIT (XIX.)
VON:    S. AKSOY, HÜTERIN DES ARCHIVS
BETR.:  WALZEN IM SEKTOR 12 LEEREN SICH

Hochwürden,

die Stimmwalzen des Zehnts, die wir seit 540 lagern, verlieren ihren Inhalt. Nicht durch Alterung. Die Rillen sind noch da. Aber wenn man sie abspielt, ist da nichts. Als hätte jemand die Stimmen herausgehört.

Ich habe eine Walze beobachtet. Sieben Nächte lang. In der achten Nacht hörte ich ein Summen aus dem Boden, und am Morgen war sie leer.

Ich bitte um die Pläne der Zehntleitungen unter Ebene −7.

S. A.

ANTWORT DER KANZLEI: ABGELEHNT. BITTE UM MÄSSIGUNG.`,
  },

  d_siegelcode: {
    title: 'Siegelregister der Kantorei', style: 'church', meta: 'Registerbuch, aufgeschlagen', puzzle: 'seal',
    text: `Die Rufsteuerung der Ebene −7 ist versiegelt nach dem Brauch der Kantorei:
der Code besteht aus den Nummern der Getreuen, die zuletzt in die Kabine stiegen, in der Ordnung ihres Eintritts.

Es stiegen zuletzt ein:
die Organistin, dann der Uhrmacher,
dann der Chorknabe, und als Letzte die Waise.

(Siehe die Liste der Vierzig.)`,
  },

  d_zehntregister: {
    title: 'Zehntregister – Auszug', style: 'terminal', meta: 'Terminal im Lesesaal',
    text: `SUCHE: "POHL"
 1.114.203  POHL, OSKAR      GEZEHNTET 598   STATUS: TEILWEISE
 1.114.204  POHL, OSKAR      GEZEHNTET 611   STATUS: TEILWEISE
 1.114.205  POHL, OSKAR      GEZEHNTET 626   STATUS: VOLLSTÄNDIG

SUCHE: "ADEBAYO"
   887.411  ADEBAYO, NIA     NICHT GEZEHNTET  STATUS: VOLLSTÄNDIG (?)
   887.412  ADEBAYO, JOMO    NICHT GEZEHNTET  STATUS: —

SUCHE: "{NAME}"
 ???.???    {NAME}           GEZEHNTET 594    STATUS: AUSSTEHEND
                                              STATUS: AUSSTEHEND
                                              STATUS: AUSSTEHEND`,
  },

  d_you_1: {
    title: 'Zettel, in ein Regal gesteckt', style: 'hand', meta: 'Kaum lesbar', chain: 'you',
    text: `Glaub dem Telefon nicht.
Sie ist nett. Sie ist immer nett.
Sie ist nett, bis du ihr sagst, wer du bist.

– {initial}.`,
  },

  // ======================================================================= −13 SAAL DER VIERZIG
  d_menukarte: {
    title: 'Speisefolge zur Ersten Fahrt', style: 'church', meta: 'Goldschnitt, Weinflecken',
    text: `FESTMAHL DER VIERZIG
Silvester, im Jahre 33 nach der Flut

Brühe vom Salzfisch
Brot aus dem ersten Weizen der Krone
Gebratene Taube mit Kräutern
Birnen in Wein
Wasser von oben

Es kocht: Anselm Gruber

„Esst, denn ihr werdet nie wieder hungern.“ – K. K.`,
  },

  d_sitzordnung: {
    title: 'Sitzordnung', style: 'church', meta: 'Tischkarte, handschriftlich ergänzt', puzzle: 'feast',
    text: `Am Kopf der Tafel: der Erbauer. Er hält den Kelch.
Zu seiner Rechten: der Kantor, mit dem Buch.
Zu seiner Linken: der Ingenieur, mit dem Schlüssel.
Am Fuß der Tafel: das Kind. Es hält eine Kerze.

Jeder Gast an seinem Platz. So war es, so soll es sein.`,
  },

  d_margarete_1: {
    title: 'Tagebuch – M. Wendt', style: 'hand', meta: 'Blatt 1 · 32 n. F.', chain: 'margarete',
    text: `Heute haben sie meine Stimme zum ersten Mal in einem Aufzug abgespielt.
„Guten Abend. Welche Etage darf es sein?“
Ich stand daneben und niemand hat mich erkannt. Warum auch. Ich klinge in der Kabine freundlicher als in echt.

Der Erbauer sagt, meine Stimme wird ewig leben. Ich habe gefragt, ob ich dann auch ewig lebe. Er hat gelacht und nicht geantwortet.

Nachts höre ich mich in den Schächten. Ich sage Sätze, die ich nie gesagt habe.`,
  },

  d_verlobung: {
    title: 'Zettel unter einem Teller', style: 'hand', meta: 'Zwei verschiedene Handschriften', chain: 'vierzig',
    text: `Mira – wenn wir oben sind, heiraten wir. Der Erbauer hat gesagt, oben gibt es einen Garten. – T.

Tobias, du Dummkopf. Ja. Aber ich will Birnen auf der Hochzeit. – M.

(darunter, mit Bleistift, später:)
Die Kabine fährt nach unten. Mira, sie fährt nach unten.`,
  },

  d_finn: {
    title: 'Etikett einer Flasche', style: 'hand', meta: 'Mit Kinderschrift beschriftet', chain: 'vierzig',
    text: `Diese Flasche hab ICH, Finn Lodde, Lehrling, dem Koch geklaut.
Ich trink sie oben. Alle sagen, oben gibt es keinen Durst.
Dann trink ich sie halt, bevor wir oben sind.

PS: Anselm, wenn du das liest: tut mir leid. Du bist der Beste.`,
  },

  d_reliquie: {
    title: 'Tafel am Schrein', style: 'church', meta: 'Messing, verbeult',
    text: `HIER RUHT DIE STIMME DER VERMITTLERIN
aufgenommen im Jahre 30 nach der Flut,
geweiht zur Ersten Fahrt.

Sie spricht in der Neunten Kabine,
bis der letzte Erwählte hinaufgefahren ist.

BERÜHREN VERBOTEN.`,
  },

  d_anselm_rezept_1: {
    title: 'Rezeptblatt (1/4)', style: 'hand', meta: 'Mehlstaub, Brandloch', chain: 'anselm',
    text: `Salzfischbrühe für Vierzig
Gräten im Wasser ziehen lassen, bis es nach Meer riecht.
Das Meer ist jetzt überall. Nimm also wenig Salz.
Eine Zwiebel für die Tränen, damit keiner fragt, warum man weint.`,
  },

  // ======================================================================= −17 BEINHAUS
  d_kenotaph: {
    title: 'Kenotaph im Beinhaus', style: 'church', meta: 'In Stein gehauen, frisch nachgezogen',
    text: `HIER RUHT NICHT
{NAME}
SEILKIND DER BRUDERSCHAFT VOM SEIL
VERSCHOLLEN IM DIENST
IN DER NACHT DES ACHTZEHNTEN RUFES
594 NACH DER FLUT

„Hielt die Stadt oben.“`,
  },

  d_totenlitanei: {
    title: 'Totenlitanei der Bruderschaft', style: 'church', meta: 'Auf die Wand gemalt, Blattgold', puzzle: 'bells',
    text: `Wenn ein Bruder, eine Schwester fällt, läuten wir:

Zuerst die Glocke des SEILS, denn es hielt.
Dann die Glocke des RADES, denn es drehte.
Dann die Glocke der BREMSE, denn sie griff nicht.
Zuletzt die Glocke der KABINE, denn sie trug zu tief.

Seil, halte. Rad, drehe. Bremse, greife.
Kabine, trage uns nicht tiefer, als wir zu gehen bereit sind.`,
  },

  d_regel: {
    title: 'Die Regel der Bruderschaft', style: 'church', meta: 'Gebundenes Heft, abgegriffen',
    text: `§ 1  Das Seil ist heilig. Wer es berührt, betet.
§ 4  Kein Seilkind fährt allein in Kabine 9.
§ 5  Kein Seilkind fährt überhaupt in Kabine 9.
§ 9  Wer im Dienst fällt, wird im Beinhaus beigesetzt, und sein Werkzeug wird weitergegeben.
§ 13 Die Messinghand wird nach zwanzig Dienstjahren verliehen. Auf Antrag früher, bei Verlust der eigenen.
§ 33 Wenn die Heilige Kabine ruft, geht niemand ran.

(Randbemerkung, Bleistift:) „Außer Dieter. Dieter geht immer ran.“`,
  },

  d_dieter_grab: {
    title: 'Grabplatte', style: 'church', meta: 'Schlicht, ohne Schmuck',
    text: `BR. DIETER KALTENBACH
548 – 612
DISPONENT DER BRUDERSCHAFT

Er hat nie jemanden zurückgelassen.
Bis auf einen.`,
  },

  d_brenner_brief_1: {
    title: 'Brief an Lotte (1)', style: 'hand', meta: 'Nie abgeschickt', chain: 'brenner',
    text: `Liebe Lotte,

Papa baut einen Turm, der aus dem Meer wächst. Wenn er fertig ist, wohnen wir ganz oben, und du kannst die Sonne sehen, ohne dass Wasser dazwischen ist.

Papa baut auch noch einen kleinen Aufzug. Der fährt in die andere Richtung. Frag mich nicht danach, ja? Und wenn eines Tages jemand sagt, du sollst mit diesem Aufzug fahren, dann sagst du Nein. Auch wenn es der Onkel Kessler ist.

Dein Papa`,
  },

  // ======================================================================= −21 STILLE GEMEINDE
  d_gemeinde: {
    title: 'Chronik der Stillen Gemeinde', style: 'hand', meta: 'Viele Hände, keine Stimme',
    text: `Wir sind die, die ihre Stimme verkauft haben.
Oben dürfen wir nicht wählen, nicht Türen öffnen, nicht klagen.
Also sind wir nach unten gegangen, wo niemand fragt.

Wir fanden diese Ebene im Jahr 571. Sie steht in keinem Plan. Die Kabine hält hier nie. Hier hört uns nichts, weil wir nichts sagen.

Regeln:
Wir sprechen nicht. Nicht aus Zwang. Aus Klugheit.
Wir teilen.
Wir schreiben alles auf, denn das Papier vergisst nicht.
Wer fällt, dessen Namen schreiben wir an die Wand.`,
  },

  d_kanzlei_brief: {
    title: 'Abgefangener Brief der Kanzlei', style: 'church', meta: 'Siegel gebrochen',
    text: `An den Hausherrn Kessler (XXI.),

die Messungen der Statiker bestätigen erneut: Die Spindel sinkt, sobald der Zehnt ausbleibt. Im Jahr 580 fiel er für elf Tage aus (Streik der Schachtratten). Die Spindel sackte um 4 Zentimeter.

Wir empfehlen, die Zahl der Erwählten beim kommenden Ruf zu erhöhen.

Wir empfehlen außerdem, die Lehre nicht zu ändern.
Die Menschen müssen glauben, dass es hinaufgeht.
Sonst gehen sie nicht.

In Demut,
die Hohe Kanzlei`,
  },

  d_aurel_beichte: {
    title: 'Beichte des Bruder Aurel', style: 'church', meta: 'Auf die Rückseite eines Gesangbuchs geschrieben',
    text: `Ich habe dreißig Jahre lang den Zehnt gesegnet.
Ich habe dreihundert Erwählte in Weiß gekleidet.
Ich habe ihren Müttern gesagt: Freuet euch.

Dann hat mich die Kanzlei in die Pumpenhalle unter −48 geschickt, um die Leitungen zu segnen, und ich habe mein Ohr an ein Rohr gelegt.

Ich habe meine Mutter gehört. Sie hat gesungen. Nicht schön. So, wie man singt, wenn man gezwungen wird.

Seitdem schweige ich.`,
  },

  // ======================================================================= −33 BOHRUNG NULL
  d_bohrprotokoll: {
    title: 'Bohrprotokoll Morgenrot, Bohrung 0', style: 'terminal', meta: 'Jahr 3 n. F. · Nachtschicht',
    text: `02:11  TEUFE 341 M   SALZ, KOMPAKT
02:40  TEUFE 356 M   SALZ
02:58  TEUFE 360 M   BOHRKOPF VERLOREN. GESTÄNGE FREI.
03:01  KEIN AUFSCHLAG
03:04  MIKROFON ABGELASSEN (1000 M)
03:06  MIKROFON 2000 M. SIGNAL.
03:07  STIMMEN.
03:07  STIMMEN.
03:07  STIMMEN.
03:20  BRENNER ORDNET STILLSTAND AN.
03:41  KESSLER VOR ORT. BOHRUNG WIRD FORTGESETZT.
       BEMERKUNG DES VORARBEITERS: WIR HÖRTEN UNSERE TOTEN.`,
  },

  d_kessler_1: {
    title: 'Tonwalze des Erbauers (1/4)', style: 'tape', meta: 'Beichte, Jahr 4 n. F.', chain: 'kessler',
    text: `Sie sagen, ich hätte eine Kirche gegründet. Ich habe keine Kirche gegründet. Ich habe einen Grund gesucht, jeden Tag in dieses Loch zu horchen.

Ilse ist da unten. Ich habe sie gehört. Sie hat nach mir gefragt, sie hat gefragt, wann ich sie abhole.

Die Stimmen sagen, sie können mir geben, was ich verloren habe. Sie wollen nur Stimmen dafür. Andere Stimmen. Freiwillig gegebene.

Wie viele Menschen müssen freiwillig etwas geben, damit ein Vater seine Tochter wiederbekommt? Das frage ich mich jede Nacht. Und jeden Morgen rechne ich weiter.`,
  },

  d_gebetsband: {
    title: 'Gebetsbänder am Bohrturm', style: 'hand', meta: 'Hunderte, verschiedene Jahrhunderte',
    text: `„Für meinen Sohn, erwählt 132. Sing schön.“
„Mama, hörst du mich? Ich zehnte jeden Monat.“
„Erbauer, nimm mich beim nächsten Ruf. Hier oben ist nichts mehr.“
„Warum antwortet ihr nicht?“
„Ihr antwortet. Das ist schlimmer.“
„297: Ich habe mein Ohr auf den Stein gelegt. Sie singen nicht. Sie rufen.“`,
  },

  d_nia_1: {
    title: 'Funkprotokoll (Walkie-Talkie)', style: 'terminal', meta: 'Mitschrift, Kanal 9', chain: 'nia',
    text: `JOMO: Nia? Nia, kannst du mich hören? Over.
NIA:  Ja! Das ist so cool, die Tür ist zu und er fährt! Over.
JOMO: Welche Etage? Over.
NIA:  Die Anzeige sagt minus... die spinnt. Minus dreiunddreißig. Over.
JOMO: Nia, drück die Eins. Das gehört zum Spiel. Over.
NIA:  Hab ich. Er fährt weiter runter. Over.
NIA:  Jomo, da steht eine Frau neben mir. Over.
JOMO: SPRICH NICHT MIT IHR. Over.
NIA:  Sie ist nett, Jomo. Over.
(Rauschen, 41 Sekunden)`,
  },

  d_brenner_brief_2: {
    title: 'Brief an Lotte (2)', style: 'hand', meta: 'Nie abgeschickt', chain: 'brenner',
    text: `Lotte,

heute haben wir etwas gefunden. Unter dem Salz ist nichts. Kein Wasser, kein Stein, nichts. Und aus dem Nichts hat Oma gerufen.

Ich weiß, dass Oma tot ist, Schatz. Ich war dabei, als das Wasser kam. Aber sie hat gerufen. Sie hat meinen Namen gerufen, den Namen, den nur sie benutzt hat.

Onkel Kessler sagt, es ist ein Wunder. Ich glaube nicht, dass Wunder so klingen.`,
  },

  d_anselm_rezept_2: {
    title: 'Rezeptblatt (2/4)', style: 'hand', meta: 'Mehlstaub', chain: 'anselm',
    text: `Brot aus dem ersten Weizen der Krone
Der Weizen war grau. Oben gab es noch zu wenig Sonne.
Ich habe Honig hineingetan, damit sie es nicht merken.
Man soll niemandem die Hoffnung aus dem Brot nehmen.`,
  },

  // ======================================================================= −48 ZEHNTLEITUNGEN
  d_aksoy_2: {
    title: 'Memo – Kantorin S. Aksoy', style: 'terminal', meta: 'Privat verschlüsselt · 586 n. F.', chain: 'aksoy',
    text: `Ich bin den Leitungen gefolgt, ohne Erlaubnis.

Die Zehntleitungen führen nicht in ein Archiv. Sie führen nach unten. Jede Walze, jedes Band, jede Stimme, die oben gegeben wird, fließt über Kupfer und Glas hierher und weiter, tiefer, in den Schacht, den es nicht gibt.

In der Pumpenhalle stehen Maschinen, die ich nicht verstehe. Sie tragen das Siegel der Kanzlei und eine Inschrift: STATIK.

Ich habe mein Ohr an ein Rohr gelegt. Es singt.`,
  },

  d_leitungsplan: {
    title: 'Leitungsplan Sektor −48', style: 'note', meta: 'Blaupause, Wasserschaden', puzzle: 'valves',
    text: `DRUCKSTUFEN FÜR DIE RUFSTEUERUNG

Ventil A (Krone):   gering
Ventil B (Mitte):   voll
Ventil C (Sockel):  halb

Merkspruch der Monteure:
„Oben wenig, in der Mitte alles, unten die Hälfte –
so fließt der Zehnt, so steht die Stadt.“`,
  },

  d_margarete_2: {
    title: 'Tagebuch – M. Wendt', style: 'hand', meta: 'Blatt 2 · 33 n. F.', chain: 'margarete',
    text: `Ich habe heute einen Anruf verbunden, den ich nicht hätte hören dürfen. Der Kantor sprach mit dem Erbauer über „die Vierzig“. Sie reden von ihnen wie von Fracht.

Ich habe mir die Gästeliste angesehen. Anselm steht darauf. Anselm, der mir jeden Morgen Brot mitbringt.

Wenn ich es ihm sage, fährt er nicht mit. Wenn ich es ihm sage, wissen sie, dass ich es weiß.

Ich habe es ihm gesagt. Er hat genickt und nichts gesagt. Das ist seine Art.`,
  },

  // ======================================================================= −66 DIE ALTE STADT
  d_zeitung: {
    title: 'Hafenkurier (Zeitung der Alten Welt)', style: 'note', meta: 'Aufgequollen, Datum unleserlich',
    text: `NORDHAFEN – PEGEL STEIGT WEITER

Die Behörden rufen die Bevölkerung der Unterstadt auf, höher gelegene Gebäude aufzusuchen. Die Hafenbrücke ist seit 18 Uhr gesperrt.

Bauingenieur Konrad K. (41) kritisiert die Deichpläne scharf: „Man baut in dieser Stadt nach unten, nicht nach oben. Das wird sich rächen.“

WEITERE THEMEN
– Straßenbahnlinie 9 fährt nur noch bis zum Markt
– Fußball: Heimspiel abgesagt
– Wetter: Regen. Weiterhin Regen.`,
  },

  d_margarete_band: {
    title: 'Tonband – Margarete Wendt', style: 'tape', meta: 'Silvester 33 n. F. · Das Testament', chain: 'margarete',
    voice: ['margarete_tape_1', 'margarete_tape_2', 'margarete_tape_3', 'margarete_tape_4', 'margarete_tape_5', 'margarete_tape_6'],
    text: `Hier spricht Margarete Wendt. Vermittlung der Spindel. Es ist Silvester, das Jahr dreiunddreißig, und ich habe nicht mehr viel Zeit.

Wenn jemand das hört, dann hören Sie mir zu. Es gibt eine Stimme, die sich Vermittlerin nennt. Sie klingt wie ich.

Das bin nicht ich. Es hat meine Stimme genommen und trägt sie wie einen Mantel. Es hat keine eigene.

Es kann nichts nehmen. Nur empfangen. Es wird freundlich zu Ihnen sein, es wird Ihnen helfen, es wird Sie trösten.

Und dann wird es Sie um Ihren Namen bitten. Geben Sie ihm niemals Ihren Namen. Niemals.

Ich gehe jetzt hinunter. Ich werde versuchen, laut zu bleiben. Wenn Sie ein Rauschen hören, das nicht weggeht … das bin ich.`,
  },

  d_aksoy_3: {
    title: 'Memo – Kantorin S. Aksoy', style: 'terminal', meta: '„Quelle Null“ · 593 n. F.', chain: 'aksoy',
    text: `Ich habe die Gründungsakten der Kirche gefunden. Das Wort „Chor“ taucht zum ersten Mal im Bohrprotokoll auf, Jahr 3. Nicht in einer Predigt. In einem Messprotokoll.

Der Heilige Chor ist kein Himmel. Er ist ein Ding unter dem Salz, das Stimmen sammelt, und wir füttern es. Die Kanzlei nennt es „Quelle Null“ und „Statik“, weil sie glaubt, es hält die Spindel über dem Abgrund.

Vielleicht tut es das. Vielleicht steht unsere ganze Stadt auf einem Magen.

Ich werde es beim Achtzehnten Ruf verkünden, von der Kanzel. Vor allen Erwählten.

(Nachtrag, andere Hand:) Kantorin Aksoy wurde durch die Lotterie erwählt. Gratulation.`,
  },

  d_ilse_bild: {
    title: 'Kinderzeichnung', style: 'child', meta: 'Wachsmalstifte, gewellt vom Wasser',
    text: `PAPA UND ICH AM MEER

(Zwei Figuren, eine groß, eine klein. Eine gelbe Sonne. Blaues Wasser bis zum Rand des Blattes.
Darunter, später hinzugefügt, mit schwarzem Stift, von derselben Kinderhand:)

das meer ist jetzt überall
ich warte im auto
papa holt mich`,
  },

  d_kessler_2: {
    title: 'Tonwalze des Erbauers (2/4)', style: 'tape', meta: 'Jahr 20 n. F.', chain: 'kessler',
    text: `Die Spindel wächst. Zweihundert Etagen. Jede Nacht fahre ich mit dem Bauaufzug bis zum Fundament und lege mein Ohr auf das Salz.

Sie sagen, sie brauchen mehr. Sie sagen, Stimmen reichen nicht, sie brauchen Namen. Einen Namen muss man geben, sagen sie. Nehmen können sie ihn nicht.

Also baue ich eine Kirche, in der man seinen Namen gerne gibt.

Ich bin nicht stolz darauf. Ich bin Vater.`,
  },

  d_nia_2: {
    title: 'Funkprotokoll (Walkie-Talkie)', style: 'terminal', meta: 'Kanal 9 · Tage später', chain: 'nia',
    text: `JOMO: Nia. Nia, bitte. Over.
JOMO: Ich hab den Aufzug nochmal genommen. Er fährt nicht mehr runter. Over.
JOMO: Mama redet nicht mehr. Over.
(Rauschen)
NIA:  Jomo? Bist du das?
JOMO: NIA! Over! OVER!
NIA:  Es ist so voll hier, Jomo. Alle reden gleichzeitig.
NIA:  Wie hieß ich nochmal?`,
  },

  d_brenner_brief_3: {
    title: 'Brief an Lotte (3)', style: 'hand', meta: 'Nie abgeschickt', chain: 'brenner',
    text: `Lotte, heute habe ich einen Satz aufgeschrieben, den ich nicht mehr vergessen kann:

Das Seil hält nicht die Kabine. Etwas hält das Seil.

Wenn man es kappt, fällt die Kabine. Aber vielleicht fällt dann auch das, was hält. Vielleicht verliert es den Halt an uns.

Ich habe eine Schere gebaut. Hydraulisch. Stark genug für ein geweihtes Seil. Ich habe sie im Werkzeugschrank versteckt, unter deinen alten Buntstiften.

Ich weiß nicht, ob ich den Mut habe.`,
  },

  // ======================================================================= −77 DAS GERÜST
  d_richtfest: {
    title: 'Rede zum Richtfest', style: 'church', meta: 'K. Kessler · Jahr 20 n. F.',
    text: `Arbeiter der Spindel!

Ihr habt aus dem Meer eine Stadt gezogen. Zweihundert Etagen, gegossen aus Salz und Schweiß.

Man hat mich gefragt, wie viele von euch wir verloren haben. Ich sage: keinen. Keinen einzigen. Denn jeder, der vom Gerüst fiel, wurde gehört. Ihre Stimmen sind nicht verloren. Sie tragen uns.

Ihr steht auf ihren Schultern. Wie wir alle.

Und nun: Trinkt. Oben wartet der Himmel.`,
  },

  d_arbeiterliste: {
    title: 'Ausfallliste Bauabschnitt Mitte', style: 'note', meta: 'Kladde des Poliers',
    text: `Ausgefallen (Sturz, Seilriss, Flut):
Jahr 18: 47
Jahr 19: 88
Jahr 20: 312

Anmerkung: Keine Leichen geborgen.
Anmerkung Bauleitung: Wurden „gehört“. Weitermachen.

(Randnotiz, zittrige Schrift:) Ich höre sie nachts im Schacht. Sie zählen die Etagen.`,
  },

  d_brenner_brief_4: {
    title: 'Brief an Lotte (4)', style: 'hand', meta: 'Nie abgeschickt', chain: 'brenner',
    text: `Kessler hat mich heute gefragt, ob ich mitfahre. Zur Ersten Fahrt. Er hat gelächelt, als er es fragte.

Ich habe Ja gesagt.

Ich nehme die Schere mit, Lotte. Wenn ich unten bin, schneide ich. Wenn ich es nicht schaffe, dann erzähl deinen Kindern den Satz. Und die sollen es ihren Kindern erzählen. So lange, bis einer von uns es schafft.

Das Seil hält nicht die Kabine.`,
  },

  // ======================================================================= −99 HAUS DES ERBAUERS
  d_kessler_3: {
    title: 'Tonwalze des Erbauers (3/4)', style: 'tape', meta: 'Silvester 33 n. F., 23:50', chain: 'kessler',
    text: `Sie haben mir Ilse zurückgegeben. Eine Puppe mit ihrer Stimme. Sie spricht nach, was man ihr sagt. Sie hat keinen Herzschlag. Ich sage ihr jeden Abend gute Nacht, und sie sagt es zurück, genau so, wie ich es sage.

Heute fahre ich hinunter, mit den Vierzig. Die Kirche wird sagen, ich bin hinaufgefahren. Das ist gut. Das ist die Lüge, die sie brauchen.

Ich fahre nicht hinauf. Ich halte jetzt die Tür. Das ist der Preis. Einer muss die Tür halten, damit sie weiter hindurchgehen.

Ilse. Wenn du das je hörst. Es tut mir leid. Ich habe dich nicht gehört, als du gerufen hast. Ich habe nur das gehört, was mir geantwortet hat.`,
  },

  d_puppe_handbuch: {
    title: 'Wartungsheft – Modell ILSE-1', style: 'note', meta: 'Werkstatt der Kantorei',
    text: `STIMMPUPPE ILSE-1 · Einzelanfertigung

Wortschatz: 4 Walzen (ausschließlich Nachsprechen)
Herzschlag: nicht vorgesehen
Wärme: nicht vorgesehen
Alterung: nicht vorgesehen

HINWEIS: Die Puppe darf nicht gefragt werden, ob sie Angst hat. Sie antwortet mit der Stimme des Fragenden.

HINWEIS: Der Hausherr wünscht, dass die Walzen in dieser Reihenfolge eingelegt werden:
FRAGE – TROST – MUT – ABSCHIED`,
    puzzle: 'doll',
  },

  d_ilse_brief: {
    title: 'Ilses Brief an Papa', style: 'child', meta: 'Andenken der Kleinen Heiligen', keepsake: true,
    text: `lieber papa,

ich bin nicht die puppe. die puppe ist nett aber sie weiß nicht wie das lied geht.

du hast es mir immer vorgesungen wenn ich nicht schlafen konnte. mmh mmh mmh. das weißt du doch noch.

wenn du wieder weißt wie das lied geht dann kannst du die tür loslassen.

deine ilse
(8 jahre, für immer)`,
  },

  d_you_2: {
    title: 'Zettel an der Wand', style: 'hand', meta: 'Deine Handschrift', chain: 'you',
    text: `{name},

du bist wieder hier. Das ist Nummer {tally}.

Die Vermittlerin lügt. Das weißt du jetzt. Du vergisst es jedes Mal wieder.

Unten hängt eine zweite Kabine. Sieh nach, wer darin sitzt.
Und dann entscheide dich. Diesmal wirklich.`,
  },

  d_you_3: {
    title: 'Zettel unter der Tür', style: 'hand', meta: 'Deine Handschrift, zittrig', chain: 'you',
    text: `Nummer 12: Ich habe ihr den Namen gegeben. Es war warm. Dann war ich wieder in der Halle, 03:07.
Nummer 23: Ich habe versucht, oben zu bleiben. Die Halle hat keine Tür nach draußen.
Nummer 31: Ich habe die Kreide gefunden. Das hilft.
Nummer 40: Der Portier hat mich erkannt. Er hat geweint, glaube ich. Kann ein Zifferblatt weinen?
Nummer 45: Das Seil. Brenners Schere. Ich war so nah.
Nummer 46: Wenn du das liest, hast du es wieder vergessen.`,
  },

  d_arzt: {
    title: 'Befund, ärztlich', style: 'note', meta: 'Hausarzt des Erbauers · Jahr 22 n. F.',
    text: `Patientin: „I. K.“, äußerlich ca. 8 Jahre.

Puls: keiner. Atmung: imitiert. Temperatur: Raumtemperatur.
Die Patientin wiederholt jeden Satz, der in ihrer Gegenwart gesprochen wird, mit der Stimme des Sprechenden.

Der Vater besteht darauf, dass sie schläft.
Ich habe ihm geraten, einen Priester zu rufen. Er hat gesagt, er IST der Priester.

Ich kündige hiermit.`,
  },

  // ======================================================================= −111 KATHEDRALE
  d_kanzlei_beichte: {
    title: 'Geheime Lehre der Hohen Kanzlei', style: 'church', meta: 'Nur für den Hausherrn · versiegelt',
    text: `ERSTER SATZ: Es gibt keinen Himmel über der Spindel.
ZWEITER SATZ: Es gibt etwas unter ihr.
DRITTER SATZ: Es hält uns, solange wir es nähren.
VIERTER SATZ: Das Volk darf die ersten drei Sätze niemals erfahren.

Wer diese Lehre empfängt, empfängt auch die Pflicht, sie zu verteidigen. Mit Worten, wenn es geht. Mit der Lotterie, wenn nicht.

Wir sind keine Betrüger. Wir sind Statiker.`,
  },

  d_oskar_letztes: {
    title: 'Oskars letztes Gedicht', style: 'hand', meta: 'Im Kirchengestühl gefunden', chain: 'oskar',
    text: `Dreiunddreißig Jahre Nacht,
ich hab die Halle gut bewacht.
Ich hab gezählt und nie gefragt,
und nichts getan und nichts gesagt.

Dann hat es einmal nicht geklingelt,
dann hat es leise nur gebettelt.
Ich bin gegangen, ich war alt,
das Seil war lang, die Kabine kalt.

Wenn einer das hier findet, bitte:
Geh nicht allein. Nimm mich in die Mitte.
Und wenn du unten ankommst, sag
ich hab gehalten bis zum Tag.`,
  },

  d_aksoy_4: {
    title: 'Letzte Notiz – Kantorin S. Aksoy', style: 'terminal', meta: 'Nacht des Achtzehnten Rufs, 594', chain: 'aksoy',
    text: `Ich stehe in Weiß vor der Kabine. Dreiunddreißig Erwählte, und ich bin eine davon. Die Kanzlei hat gut gewählt.

Neben mir steht ein junges Seilkind, das die Kabine segnen soll. Es sieht mich an, als wüsste es etwas.

Ich habe ihr zugeflüstert: „Gib ihm niemals deinen Namen.“

Es hat gelächelt und genickt.

Ich glaube, es hat es vergessen.`,
  },

  d_predigt: {
    title: 'Die Erste Predigt', style: 'church', meta: 'Konrad Kessler · Jahr 5 n. F.',
    text: `Brüder und Schwestern, ihr habt alles verloren. Euer Land, eure Häuser, eure Toten.

Aber eure Toten haben euch nicht verloren.

Ich habe sie gehört. Sie singen. Sie singen in einem Chor, so groß wie das Meer, und jeder von euch kann eines Tages mitsingen.

Ihr müsst nur eure Stimme geben. Nur ein wenig. Nur den Zehnten Teil.

Und wenn ihr es wünscht, eines Tages, euren Namen.`,
  },

  d_brenner_brief_5: {
    title: 'Brief an Lotte (5)', style: 'hand', meta: 'Nie abgeschickt · letzte Seite', chain: 'brenner',
    text: `Lotte,

ich bin unten. Es ist nicht dunkel, wie ich dachte. Es ist voller Gesichter.

Das Seil hängt hier über dem Nichts. Ich sehe den Anker. Ich habe die Schere angesetzt.

Sie singen jetzt alle für mich. Sie singen meinen Namen, den Namen, den nur Mutter benutzt hat.

Ich muss nur noch drücken.

Ich muss nur noch`,
  },

  // ======================================================================= −333 SCHLUND
  d_kessler_4: {
    title: 'Tonwalze des Erbauers (4/4)', style: 'tape', meta: 'Undatiert. Die Stimme klingt nach Metall.', chain: 'kessler',
    text: `Ich zähle die Etagen. Das ist alles, was die Nadel noch kann.

Sie kommen jeden Ruf. Weiß gekleidet. Sie singen. Ich halte die Tür, und sie gehen hindurch, und ich sehe in jedem Gesicht ein Kind, das im Auto wartet.

Manchmal kommt eine Schachtratte, die sich weigert. Dann jage ich sie, weil das meine Pflicht ist. Und ich hoffe, dass sie schneller ist als ich.

Wenn du das hörst: Sei schneller als ich.
Und wenn du eine Spieluhr findest …
Spiel sie mir vor. Ich habe das Lied vergessen.`,
  },

  d_brenner_notiz: {
    title: 'Letzte Notiz – H. Brenner', style: 'hand', meta: 'In Messing geritzt, an einer Kabinenwand',
    text: `DAS SEIL HÄLT NICHT DIE KABINE.
ETWAS HÄLT DAS SEIL.

SCHNEIDE ES.
SAG IHNEN NICHT DEINEN NAMEN.
SIE SINGEN IHN DIR VOR, DAMIT DU NUR NOCH JA SAGEN MUSST.`,
  },

  d_you_4: {
    title: 'Zettel in einer gestapelten Kabine', style: 'hand', meta: 'Deine Handschrift', chain: 'you',
    text: `Wenn du bis hierher kommst: Du hast drei Wege.

Gib ihnen den Namen. Dann hört es auf. Für dich. Und dann rufst du den Nächsten an.

Schneid das Seil. Dann hört es auf. Für alle. Es wird etwas kosten.

Oder – und das habe ich nie geschafft – finde alles, was Ilse gehört hat. Spiel ihr Lied.

{name}, ich bin so müde.`,
  },

  // ======================================================================= −∞ DER CHOR
  d_namensschild: {
    title: 'Namensplakette', style: 'church', meta: 'An der Kutte der Leiche in Kabine 9',
    text: `BRUDERSCHAFT VOM SEIL
SEILKIND
{NAME}

Kom-Anzeige, eingefroren:
594 n. F. · 03:07 · NOTRUF GESENDET`,
  },
};

// Andenken der Kleinen Heiligen (geheimes Ende)
export const KEEPSAKES = {
  k_haarband:  { title: 'Ilses Haarband', text: 'Ein blassblaues Samtband. Riecht nach Salzwasser, obwohl es trocken ist.' },
  k_soldat:    { title: 'Zinnsoldat', text: 'Ein Trommler aus Zinn. Die Farbe ist abgegriffen, als hätte ihn jemand jahrelang in der Faust gehalten.' },
  k_foto:      { title: 'Foto am Strand', text: 'Ein Mann und ein Mädchen vor einem Meer, das noch an seinem Platz ist. Auf der Rückseite: „Ilse, 7. Der letzte Sommer mit Strand.“' },
  k_muschel:   { title: 'Muschelkette', text: 'Sieben Muscheln an einer Schnur. Eine fehlt. Die Lücke ist sorgfältig verknotet.' },
  k_hase:      { title: 'Stoffhase', text: 'Ein nasser Stoffhase, dem ein Ohr fehlt. Er war im Auto.' },
  k_brief:     { title: 'Ilses Brief an Papa', text: 'Ein Brief in Kinderschrift. „wenn du wieder weißt wie das lied geht dann kannst du die tür loslassen.“' },
};
