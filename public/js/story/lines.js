// TIEFER – Sprechtexte (Hybrid). Vertonte Dateien: /audio/voice/<id>.ogg
// Format: id: [Sprecher, Text]  oder  id: { parts: [[Sprecher, Text], …] }
// Sprecher: vermittlerin · rauschen · margarete · ilse · chor · kessler · brenner · aksoy · oskar
//           dieter · ada · voss · veit · nia · vorarbeiter · kantor · radio · puppe · crew_m · crew_f

export const LINES = {

  // ======================================================================
  // ERSTE NACHT – Ankunft in Markt Neun (Tutorial)
  // ======================================================================
  d_intro_1:   ['dieter', 'Da seid ihr ja. Mannschaft siebenundvierzig. Kommt rein, bevor der Regen euch die Weihe abwäscht.'],
  d_intro_2:   ['dieter', 'Bruder Dieter. Disposition. Ich verteile die Aufträge, ihr kommt lebend zurück. So einfach ist das. Meistens.'],
  d_intro_3:   ['dieter', 'Ihr habt den Bergungsvertrag unterschrieben. Jede Woche will die Kanzlei ihre Quote. Schafft ihr sie nicht, werdet ihr erwählt. Und nein, das ist nicht so schön, wie es klingt.'],
  d_intro_4:   ['dieter', 'Geht rüber zu Ada. Sie zeigt euch die Neunte. Und dann fahrt ihr zum ersten Mal runter. Nur bis minus zwei. Kinderspiel.'],
  d_intro_5:   ['dieter', 'Ach, und wenn das Telefon in der Kabine klingelt: Geht ran. Die Vermittlerin hilft euch. Sie hilft allen.'],

  a_intro_1:   ['ada', 'Ihr seid die Neuen? Ada Brenner. Ich halte die Neunte am Leben, und die Neunte hält euch am Leben. Behandelt sie gut.'],
  a_intro_2:   ['ada', 'Das war mal die Heilige Kabine, wisst ihr das? Die Kanzlei hat Stahl über das Nussholz geschraubt und sie Lastaufzug getauft. Entweiht. Aber sie erinnert sich.'],
  a_intro_3:   ['ada', 'Stellt die Tiefe am Hebel ein. Beute, die ihr findet, bringt ihr in die Kabine. Nur was drin liegt, zählt. Und seid um drei Uhr sieben wieder hier.'],
  a_intro_4:   ['ada', 'Warum drei Uhr sieben? Frag nicht. Um drei Uhr sieben löst die Bremse und die Neunte schießt hoch. Mit euch oder ohne euch.'],

  // ======================================================================
  // DIE VERMITTLERIN – Kabinentelefon
  // ======================================================================
  v_e0_hello:  ['vermittlerin', 'Vermittlung der Spindel. Kabine Neun, können Sie mich hören?'],
  v_e0_hello2: ['vermittlerin', 'Gut. Atmen Sie. Sie sind nicht allein, Seilkind.'],
  v_e0_stay:   ['vermittlerin', 'Ich bleibe in der Leitung. Ich bleibe immer in der Leitung.'],
  v_e0_needle: ['vermittlerin', 'Achten Sie nicht auf die Nadel. Das Zifferblatt ist sehr alt.'],
  v_e0_return: ['vermittlerin', 'Willkommen zurück.'],
  v_tut_1:     ['vermittlerin', 'Die Kanzlei dankt Mannschaft siebenundvierzig für ihren Dienst. Ich werde Sie durch die erste Nacht begleiten.'],
  v_tut_2:     ['vermittlerin', 'Ihr Kom zeigt die Uhrzeit. Die Nacht beginnt um Mitternacht, wenn sich die Türen öffnen. Um drei Uhr sieben fährt die Kabine wieder hinauf.'],
  v_tut_3:     ['vermittlerin', 'Drücken Sie Q, um die Umgebung zu erfassen. Ihr Kom zeigt Ihnen, was die Kantorei für wertvoll hält.'],
  v_e1_power:  ['vermittlerin', 'Stromausfall. Das kennen Sie doch, Seilkind. Keine Sorge.'],
  v_tut_4:     ['vermittlerin', 'Bringen Sie alles, was Sie tragen können, in die Kabine. Schwere Dinge mit beiden Händen. Ich zähle mit.'],
  v_e1_lamp:   ['vermittlerin', 'Ihre Lampe wird schwächer. Kurbeln Sie. Aber … nicht zu laut.'],
  v_e1_hide:   ['vermittlerin', 'Sehen Sie den Spind? Falls Ihnen jemand begegnet, der keinen Namen mehr hat: Gehen Sie hinein. Und atmen Sie leise.'],
  v_e1_girl:   ['vermittlerin', 'Da war niemand, Seilkind. Hier unten ist seit langer Zeit niemand.'],
  v_tut_pass1: ['vermittlerin', 'Seilkind. Sehen Sie die Gestalt am Ende des Gangs? Sehen Sie sie an. Solange jemand hinsieht, kann sie sich nicht bewegen.'],
  v_tut_pass2: ['vermittlerin', 'Und im Dunkeln … sieht niemand hin.'],
  v_tut_5:     ['vermittlerin', 'Sie haben genug für heute. Kommen Sie zurück in die Kabine und legen Sie den Hebel um.'],
  v_tut_6:     ['vermittlerin', 'Sehr gut. Die Kanzlei ist zufrieden. Für den Anfang.'],

  // Ankunft / Abfahrt (Zufall)
  v_arr_1:     ['vermittlerin', 'Ankunft. Die Türen öffnen sich. Bringen Sie uns etwas Schönes mit.'],
  v_arr_2:     ['vermittlerin', 'Wir sind da. Es ist sehr still hier unten. Das ist gut. Meistens.'],
  v_arr_3:     ['vermittlerin', 'Ankunft. Denken Sie an die Uhr, Seilkind. Die Uhr denkt an Sie.'],
  v_arr_4:     ['vermittlerin', 'Die Luft ist gut. Die Wände sind alt. Der Rest wird sich zeigen.'],
  v_dep_1:     ['vermittlerin', 'Hinab also. Halten Sie sich fest.'],
  v_dep_2:     ['vermittlerin', 'Es wird ein wenig ruckeln.'],
  v_dep_3:     ['vermittlerin', 'Möchten Sie, dass ich etwas singe? Nein? Schade.'],
  v_dep_4:     ['vermittlerin', 'Wissen Sie, wie viele Stufen die Spindel hat? Nach unten hin zählt niemand.'],
  v_dep_5:     ['vermittlerin', 'Sie machen das sehr gut. Die meisten Mannschaften hätten schon aufgegeben.'],
  v_dep_6:     ['vermittlerin', 'Hören Sie die anderen? Nein? Dann hören Sie genauer hin.'],
  v_up_1:      ['vermittlerin', 'Aufwärts. Die Kanzlei freut sich auf Ihre Gaben.'],
  v_up_2:      ['vermittlerin', 'Sie kommen zurück. Sie kommen immer zurück.'],
  v_up_lost:   ['vermittlerin', 'Nicht alle sind an Bord. Das ist traurig. Sie werden hier unten gut aufgehoben sein.'],

  // Zeit
  v_time_230:  ['vermittlerin', 'Es ist halb drei, Seilkind. Die Kabine wird unruhig.'],
  v_time_250:  ['vermittlerin', 'Zehn nach zu spät. Verzeihung. Zehn vor drei. Kommen Sie zurück.'],
  v_time_300:  ['vermittlerin', 'Drei Uhr. Hören Sie die Glocke? Sie läutet für Sie.'],
  v_time_305:  ['vermittlerin', 'Die Türen schließen sich in einer Minute. Wer draußen bleibt, bleibt bei uns.'],
  v_time_307:  { parts: [['vermittlerin', 'Drei Uhr sieben.'], ['chor', 'Wir rufen.']] },

  // Kabine / Mannschaft
  v_all_in:    ['vermittlerin', 'Sind alle an Bord? Gut. Niemand bleibt zurück. Niemand bleibt je zurück.'],
  v_wait_others: ['vermittlerin', 'Wir warten auf die anderen. Die Kabine fährt nicht ohne ihre Fahrgäste.'],
  v_cabin_idle: ['vermittlerin', 'Die Kabine wartet. Sie wartet gern. Aber nicht ewig.'],
  v_death_1:   ['vermittlerin', 'Oh. Einer weniger. Wir kümmern uns um ihn.'],
  v_death_2:   ['vermittlerin', 'Keine Sorge um die Verlorenen. Hier unten geht niemand verloren.'],

  // Gaben (Namensbuchstaben)
  v_gift_offer: ['vermittlerin', 'Seilkind. Sie sind erschöpft. Wir könnten Ihnen helfen. Es kostet so wenig.'],
  v_gift_price: ['vermittlerin', 'Nur einen Buchstaben. Sie haben so viele davon.'],
  v_gift_taken: ['vermittlerin', 'Danke. Er schmeckt nach Ihnen.'],
  v_gift_refuse:['vermittlerin', 'Wie Sie wünschen. Das Angebot steht.'],
  v_gift_many:  ['vermittlerin', 'Wir kennen Sie jetzt schon so gut.'],

  // Fahrt-Ereignisse
  v_r1_knock:  ['vermittlerin', 'Das sind die Seile. Sie setzen sich. Das tun sie immer.'],
  v_r1_hatch:  ['vermittlerin', 'Öffnen Sie die Luke nicht. Bitte.'],
  v_r2_dark:   ['vermittlerin', 'Kleine Schwankung im Netz. Bleiben Sie, wo Sie sind.'],
  v_r2_mirror: ['vermittlerin', 'Schauen Sie nicht so lange ins Messing, Seilkind. Es ist ein altes Metall. Es erinnert sich.'],

  // ======================================================================
  // HUB – Bruder Dieter (Disposition)
  // ======================================================================
  d_hello_1:   ['dieter', 'Na, noch alle Finger dran? Dann schauen wir mal, was die Nacht hergibt.'],
  d_hello_2:   ['dieter', 'Aufträge hängen am Brett. Nehmt, was ihr tragen könnt. Und ein bisschen mehr.'],
  d_hello_3:   ['dieter', 'Die Kanzlei fragt nach euch. Ich hab gesagt, ihr seid die Besten. Enttäuscht mich nicht, sonst muss ich lügen lernen.'],
  d_hello_4:   ['dieter', 'Ich hab Kaffee. Er ist kalt. Er ist immer kalt. Ich weiß nicht warum.'],
  d_quota_ok:  ['dieter', 'Quote erfüllt. Die Kanzlei nickt. Das ist das Höchste, was die Kanzlei tut.'],
  d_quota_low: ['dieter', 'Es wird knapp mit der Quote. Heute Nacht müsst ihr tiefer. Tiefer bringt mehr. Tiefer bringt auch mehr Ärger.'],
  d_quota_fail:['dieter', 'Es tut mir leid, Kinder. Es tut mir wirklich leid. Die Kantoren kommen.'],
  d_week:      ['dieter', 'Neue Woche, neue Quote. Sie steigt. Sie steigt immer. Wie das Wasser damals.'],
  d_deep:      ['dieter', 'Ada sagt, das Seil reicht jetzt tiefer. Ich hab da unten Leute verloren. Zu viele. Passt auf.'],
  d_46:        ['dieter', 'Sechsundvierzig Mannschaften vor euch. Ich hab jede einzelne losgeschickt. Ich hab jede einzelne gemocht.'],
  d_story_13:  ['dieter', 'Die Kanzlei will die Stimmreliquie aus dem Saal der Vierzig. Minus dreizehn. Ein Kirchenauftrag, goldene Siegel. Das zahlt die ganze Woche.'],
  d_story_33:  ['dieter', 'Bohrung Null. Die Horchstation soll wieder laufen. Die Kanzlei will hören, was da unten ist. Ich will das nicht, aber mich fragt keiner.'],
  d_story_66:  ['dieter', 'Minus sechsundsechzig. Da unten liegt das Archiv einer Kantorin, die zu viel gelesen hat. Die Kanzlei will es zurück. Ungelesen.'],
  d_story_99:  ['dieter', 'Das Haus des Erbauers. Sie sagen, es steht da unten, mitten im Fels. Holt die Spieluhr. Und wenn ihr einen großen Mann mit einer Uhr im Gesicht seht … lauft.'],
  d_story_333: ['dieter', 'Minus dreihundertdreiunddreißig. Keine Mannschaft ist von dort zurückgekommen. Außer einer. Und die hat nie wieder gesprochen.'],
  d_story_inf: ['dieter', 'Da unten ist Mannschaft sechsundvierzig. Ich hab sie geschickt. Ich hab gesagt, ich hol sie. Wenn ihr sie findet … sagt ihnen, dass ich es versucht habe.'],
  d_bye:       ['dieter', 'Möge das Seil euch halten.'],

  // Ada (Werkstatt)
  a_hello_1:   ['ada', 'Na? Kommt ihr zum Schrauben oder zum Jammern? Beides kostet.'],
  a_hello_2:   ['ada', 'Die Neunte hat gestöhnt, als ihr hochkamt. Sie mag euch. Glaub ich.'],
  a_buy_1:     ['ada', 'Gute Wahl. Ich bau es heute Nacht ein. Schlafen wird überbewertet.'],
  a_buy_2:     ['ada', 'Das hält. Das hält sogar, wenn ihr nicht haltet.'],
  a_poor:      ['ada', 'Da fehlen Marken. Ich arbeite für Messing, nicht für Hoffnung.'],
  a_seil:      ['ada', 'Mehr Seil. Mehr Tiefe. Ihr wisst, was mein Urahn gesagt hat: Das Seil hält nicht die Kabine.'],
  a_secret_1:  ['ada', 'Neunzehn Generationen haben wir ein Geheimnis weitergegeben, und das Geheimnis ist ein Satz: Das Seil hält nicht die Kabine.'],
  a_secret_2:  ['ada', 'Etwas hält das Seil. Wenn ihr ganz unten seid und wollt, dass es aufhört … dann schneidet es durch.'],
  a_letters:   ['ada', 'Bringt mir seine Briefe, falls ihr sie findet. Die an Lotte. Wir haben nie erfahren, was drinstand.'],
  a_shears:    ['ada', 'Ihr habt sie gefunden. Brenners Schere. Gebt her. Ich schleif sie euch, dass sie durch Gott selbst geht.'],

  // Voss (Schwarzmarkt)
  vo_hello_1:  ['voss', 'Ah, die Tiefentaucher! Kommt näher, kommt. Voss hat alles, was die Kirche verbietet, und einiges, was sie nicht kennt.'],
  vo_hello_2:  ['voss', 'Heiße Ware? Ich zahl mehr als die Kantorei. Zählt halt nicht zur Quote. Man kann nicht alles haben.'],
  vo_hello_3:  ['voss', 'Ihr seht müde aus. Ich hab was gegen Müdigkeit. Und gegen Monster. Und gegen Gewissen.'],
  vo_buy:      ['voss', 'Pfleg sie gut. Und wenn sie dich nicht rettet, beschwer dich bei niemandem.'],
  vo_sell:     ['voss', 'Schönes Stück. Die Kanzlei hätte dir die Hälfte gegeben und ein Gebet dazu.'],
  vo_name:     ['voss', 'Ein Buchstabe deines Namens? Für den zahl ich richtig gut. Frag nicht, wer ihn am Ende kauft.'],
  vo_name2:    ['voss', 'Danke fürs Geschäft. Du klingst jetzt ein kleines bisschen weniger nach dir.'],
  vo_dieter:   ['voss', 'Mit wem redest du da drüben in der Disposition? Da ist seit Jahren keiner.'],

  // Kantor Veit (Kantorei-Annahme)
  ve_hello_1:  ['veit', 'Gesegnet sei die Hand, die aus der Tiefe gibt. Legt eure Gaben auf den Tisch.'],
  ve_hello_2:  ['veit', 'Die Kantorei nimmt, was ihr bringt, und die Kanzlei schreibt es euch gut. So ist es recht.'],
  ve_sell:     ['veit', 'Dies wird dem Chor übergeben. Freuet euch.'],
  ve_quota:    ['veit', 'Die Zehntwoche ist um. Die Kanzlei zieht die Quote ein. Möge sie reichen.'],
  ve_doubt:    ['veit', 'Manchmal frage ich mich, wohin die Gaben gehen, wenn wir sie nachts in die Leitungen legen. Dann bete ich, bis die Frage weggeht.'],
  ve_angry:    ['veit', 'Die Stummen senden Lügen über ihren Piratensender. Wer ihnen hilft, zahlt doppelt. Das ist nicht Rache. Das ist Buchführung.'],

  // ======================================================================
  // RAUSCHEN / ILSE / CHOR (Tiefe)
  // ======================================================================
  r_e1_1:      ['rauschen', 'N—cht … t—efer …'],
  r_e1_2:      ['rauschen', '—hören Sie—? —ist nicht—'],
  r_e2_1:      ['rauschen', '—die Liste—! Lies die—Liste—'],
  r_e3_1:      ['rauschen', 'Sie—lügt. Die Walze war leer, schon—immer—'],
  r_e3_2:      ['rauschen', 'Hör—mir zu. Ich bin—das bin—ICH—'],
  r_e6_1:      ['rauschen', 'Die Mikrofone—hörten—uns alle—ich war—auch—'],
  r_e7_1:      ['rauschen', 'Sie—sagt wir. Hast du gehört? Sie sagt—WIR—'],
  r_e8_1:      ['rauschen', 'Jetzt—hörst du—mich. Endlich. Ich bin es. Margarete.'],
  r_e8_2:      ['rauschen', 'Alles, was ihr der Kantorei gebt, fließt nachts nach unten. Ihr füttert es. Ihr füttert es jede Woche.'],
  r_e12_1:     ['rauschen', 'Gleich bist du da. Denk an das, was Ada gesagt hat. Denk an das Seil.'],
  r_rand_1:    ['rauschen', '—nicht—dem Telefon—glauben—'],
  r_rand_2:    ['rauschen', '—geh—zurück—es ist—zu spät—'],

  i_e1_hum:    ['ilse', 'Mmh-mmh … mmh-mmh-mmh …'],
  i_help_1:    ['ilse', 'Hier lang. Da drüben liegt was Schönes.'],
  i_help_2:    ['ilse', 'Nicht in den Schrank. Da ist schon wer drin.'],
  i_help_3:    ['ilse', 'Papa hat gesagt, ich soll im Auto warten. Ich warte schon so lange.'],
  i_help_4:    ['ilse', 'Kennst du das Lied? Mmh-mmh-mmh.'],
  i_keep:      ['ilse', 'Das gehört mir. Bringst du es in die Kapelle? Dann kann ich es wiederfinden.'],
  i_e10_1:     ['ilse', 'Das bin nicht ich. Die Puppe spricht nur nach. Papa wollte, dass ich wiederkomme, und da haben sie ihm die gegeben.'],
  i_e10_2:     ['ilse', 'Er hat es gewusst. Er hat trotzdem jeden Abend gute Nacht gesagt.'],

  c_near_1:    ['chor', 'Wie heißt du?'],
  c_near_2:    ['chor', 'Sag es uns. Nur einmal.'],
  c_near_3:    ['chor', 'Wir sind so viele. Wir haben Platz.'],

  // ======================================================================
  // STORY-AUFTRAG −13 · Der Saal der Vierzig
  // ======================================================================
  v_e3_arrive: ['vermittlerin', 'Der Saal der Vierzig. Hier aßen die Getreuen ihr letztes Mahl, bevor sie mit dem Erbauer hinauffuhren.'],
  v_e3_relic:  ['vermittlerin', 'Die Stimmreliquie ruht im Schrein hinter der Bühne. Bringen Sie sie der Kanzlei. Vorsichtig. Sie ist … mir sehr lieb.'],
  v_e3_merchant: ['vermittlerin', 'Der Koch. Er ist … geblieben. Er tut niemandem etwas.'],
  v_e3_shrine: ['vermittlerin', 'Seilkind? Wo sind Sie? Die Leitung ist so … still geworden.'],
  v_e3_after:  ['vermittlerin', 'Sie waren an meinem Schrein. Bitte tun Sie das nicht wieder.'],
  v_e3_after2: ['vermittlerin', 'Es gibt Dinge, die man nicht öffnet, weil man sie liebt.'],
  ve_relic:    ['veit', 'Die Reliquie. Leer? Das … das kann nicht sein. Die Vermittlerin spricht doch. Sie spricht doch jede Nacht.'],

  // ======================================================================
  // STORY-AUFTRAG −33 · Die Horchstation + Erinnerung I
  // ======================================================================
  v_e6_arrive: ['vermittlerin', 'Bohrung Null. Hier hat alles begonnen. Hier haben wir zum ersten Mal … Sie hat zum ersten Mal …'],
  v_e6_arrive2:['vermittlerin', 'Verzeihung. Die Leitung. Hier hat die Spindel ihren Grund gefunden.'],
  v_e6_listener:  ['vermittlerin', 'Seilkind. Hören Sie das Klicken? Gehen Sie in die Hocke. Es sieht nicht. Es hört.'],
  v_e6_listener2: ['vermittlerin', 'Wenn Sie rennen, hört es Sie. Wenn Sie kurbeln, hört es Sie. Wenn Sie sprechen …'],
  v_e6_station:['vermittlerin', 'Die Horchstation braucht drei Relaiszellen und ein wenig Geduld. Dann können wir wieder … zuhören.'],

  m1_intro:     ['brenner', 'Jahr drei nach der Flut. Salzstock Morgenrot, Bohrung Null. Mein Name ist Hans Brenner, und ich habe an diesem Tag aufgehört, an Böden zu glauben.'],
  m1_foreman_1: ['vorarbeiter', 'Herr Brenner! Der Kopf ist weg. Einfach weg. Das Gestänge hängt frei, dreihundert Meter und es zieht noch.'],
  m1_foreman_2: ['vorarbeiter', 'Kein Aufschlag. Kein Geräusch. Als würde es … fallen und nie ankommen.'],
  m1_brenner_1: ['brenner', 'Lasst das Mikrofon runter. Das Lange. Ich will hören, wie tief das ist.'],
  m1_foreman_3: ['vorarbeiter', 'Tausend Meter Kabel sind draußen. Zweitausend. Da ist … Herr Brenner, da ist was auf der Leitung.'],
  m1_voices:    ['chor', 'Hans … Hans, bist du das? Es ist so kalt hier. Hans, komm und hol mich.'],
  m1_brenner_2: ['brenner', 'Das … das ist meine Mutter. Meine Mutter ist in der Flut geblieben.'],
  m1_kessler_1: ['kessler', 'Was ist hier los? Brenner, warum steht die Bohrung?'],
  m1_kessler_2: ['kessler', 'Gib mir den Kopfhörer.'],
  m1_ilse:      ['ilse', 'Papa? Papa, hier ist es dunkel. Wann holst du mich ab?'],
  m1_kessler_3: ['kessler', 'Ilse. Das ist Ilse. Brenner, das ist meine Tochter.'],
  m1_kessler_4: ['kessler', 'Niemand sagt ein Wort. Niemand. Wir bauen weiter. Wir bauen genau hier.'],
  m1_outro:     ['brenner', 'Er baute genau dort. Und ich baute ihm einen Weg nach unten. Möge Gott mir das nicht vergeben, denn ich tue es auch nicht.'],

  // ======================================================================
  // STORY-AUFTRAG −66 · Das Archiv + Erinnerung II
  // ======================================================================
  v_e8_arrive:  ['vermittlerin', 'Oh. Oh, sehen Sie nur. Die Alte Welt. So hat es ausgesehen, bevor das Wasser kam.'],
  v_e8_arrive2: ['vermittlerin', 'Das ist nicht wirklich hier, Seilkind. Das ist eine Erinnerung. Aber Sie können trotzdem darin ertrinken.'],
  v_e8_water:   ['vermittlerin', 'Das Wasser trägt jeden Schritt weit. Gehen Sie langsam.'],
  v_e8_tape:    ['vermittlerin', 'Legen Sie das weg. Das ist altes Band. Das ist nichts.'],
  v_e8_tape2:   ['vermittlerin', 'Seilkind. Hören Sie auf damit. Sie macht Ihnen Angst. Ich mache Ihnen doch keine Angst.'],
  v_e8_after:   { parts: [['vermittlerin', 'Sie wissen es jetzt. Gut. Dann müssen wir uns nicht mehr verstellen.'], ['chor', 'Wir sind so müde vom Verstellen.']] },
  v_e8_after2:  ['vermittlerin', 'Aber Sie brauchen die Quote. Und wir brauchen Sie. Also machen wir weiter. Zusammen.'],

  margarete_tape_1: ['margarete', 'Hier spricht Margarete Wendt. Vermittlung der Spindel. Es ist Silvester, das Jahr dreiunddreißig, und ich habe nicht mehr viel Zeit.'],
  margarete_tape_2: ['margarete', 'Wenn jemand das hört, dann hören Sie mir zu. Es gibt eine Stimme, die sich Vermittlerin nennt. Sie klingt wie ich.'],
  margarete_tape_3: ['margarete', 'Das bin nicht ich. Es hat meine Stimme genommen und trägt sie wie einen Mantel. Es hat keine eigene.'],
  margarete_tape_4: ['margarete', 'Es kann nichts nehmen. Nur empfangen. Es wird freundlich zu Ihnen sein, es wird Ihnen helfen, es wird Sie trösten.'],
  margarete_tape_5: ['margarete', 'Und dann wird es Sie um Ihren Namen bitten. Geben Sie ihm niemals Ihren Namen. Niemals.'],
  margarete_tape_6: ['margarete', 'Ich gehe jetzt hinunter. Ich werde versuchen, laut zu bleiben. Wenn Sie ein Rauschen hören, das nicht weggeht … das bin ich.'],

  m2_radio_1:   ['radio', 'Achtung, Sturmflutwarnung für den gesamten Hafenbereich. Der Pegel steigt weiter. Suchen Sie höher gelegene Gebäude auf.'],
  m2_radio_2:   ['radio', 'Die Hafenbrücke ist gesperrt. Ich wiederhole: Die Hafenbrücke ist gesperrt.'],
  m2_papa_1:    ['kessler', 'Ilse! Ilse, bleib im Auto! Ich hole Hilfe, hörst du? Bleib, wo du bist!'],
  m2_ilse_1:    ['ilse', 'Papa? Das Wasser ist an meinen Füßen.'],
  m2_ilse_2:    ['ilse', 'Ich hab Angst. Ich sing das Lied. Dann hab ich keine Angst.'],
  m2_papa_2:    ['kessler', 'Ilse! Ilse, wo bist du? Antworte mir!'],
  m2_ilse_3:    ['ilse', 'Hier, Papa. Ich bin doch hier.'],
  m2_outro:     ['ilse', 'Papa hat mich nicht gehört. Aber jemand anders hat mich gehört. Jemand, der ganz unten wohnt.'],

  // ======================================================================
  // STORY-AUFTRAG −99 · Das Haus + Erinnerung III
  // ======================================================================
  v_e10_arrive: ['vermittlerin', 'Das Haus des Erbauers. So hat er es in Erinnerung. Wir haben es für ihn aufbewahrt.'],
  v_e10_porter: ['vermittlerin', 'Oh. Der Portier ist wach. Er hält die Tür, wissen Sie. Er hat sie schon immer gehalten.'],
  v_e10_porter2:['vermittlerin', 'Lassen Sie sich nicht von ihm sehen. Er nimmt seine Pflicht sehr ernst.'],
  v_e10_box:    ['vermittlerin', 'Die Spieluhr. Wie lange haben wir sie nicht gehört.'],
  v_e10_tally:  ['vermittlerin', 'Sechsundvierzig Striche. Sechsundvierzig Mannschaften. Und jede war so überrascht.'],
  puppe_1:      ['puppe', 'Papa? Papa, bist du das?'],
  puppe_2:      ['puppe', 'Papa, bist du das. Papa, bist du das. Papa—'],
  puppe_3:      ['puppe', 'Ich habe keine Angst. Ich habe keine Angst. Ich habe—'],
  puppe_4:      ['puppe', 'Gute Nacht, Papa. Gute Nacht, Papa. Gute Nacht.'],

  m3_intro:       ['margarete', 'Silvester im Jahr dreiunddreißig. Mein letzter Dienst am Stöpselbrett. Ich wusste es nur noch nicht.'],
  m3_caller_1:    ['kantor', 'Vermittlung? Verbinden Sie mich mit dem Erbauer. Es geht um die Gästeliste.'],
  m3_kessler_1:   ['kessler', 'Sprechen Sie.'],
  m3_kantor_1:    ['kantor', 'Die Vierzig sind vollzählig. Sie glauben, es geht in den neuen Festsaal. Keiner ahnt etwas.'],
  m3_kessler_2:   ['kessler', 'Gut. Und die Telefonistin?'],
  m3_kantor_2:    ['kantor', 'Wendt? Sie hat die Liste gesehen. Sie stellt Fragen.'],
  m3_kessler_3:   ['kessler', 'Dann setzen Sie sie auf die Liste. Einundvierzig. Er wird es nicht übel nehmen.'],
  m3_margarete_1: ['margarete', 'Einundvierzig. Er meinte mich.'],
  m3_margarete_2: ['margarete', 'Ich muss es jemandem sagen. Ich muss es aufnehmen. Irgendwo, wo sie es nicht finden.'],
  m3_kantor_3:    ['kantor', 'Fräulein Wendt! Bleiben Sie stehen! Der Erbauer möchte Sie beim Festmahl sehen!'],
  m3_outro:       ['margarete', 'Sie fanden mich um dreiundzwanzig Uhr neunundfünfzig. Aber das Band fanden sie nicht.'],

  // Tonwalzen des Erbauers (vertont)
  kw1_1: ['kessler', 'Sie sagen, ich hätte eine Kirche gegründet. Ich habe keine Kirche gegründet. Ich habe einen Grund gesucht, jeden Tag in dieses Loch zu horchen.'],
  kw1_2: ['kessler', 'Ilse ist da unten. Ich habe sie gehört. Sie hat nach mir gefragt, sie hat gefragt, wann ich sie abhole.'],
  kw1_3: ['kessler', 'Wie viele Menschen müssen freiwillig etwas geben, damit ein Vater seine Tochter wiederbekommt? Das frage ich mich jede Nacht. Und jeden Morgen rechne ich weiter.'],
  kw3_1: ['kessler', 'Sie haben mir Ilse zurückgegeben. Eine Puppe mit ihrer Stimme. Sie spricht nach, was man ihr sagt.'],
  kw3_2: ['kessler', 'Heute fahre ich hinunter, mit den Vierzig. Die Kirche wird sagen, ich bin hinaufgefahren. Das ist die Lüge, die sie brauchen.'],
  kw3_3: ['kessler', 'Ich fahre nicht hinauf. Ich halte jetzt die Tür. Einer muss die Tür halten, damit sie weiter hindurchgehen.'],
  kw4_1: ['kessler', 'Manchmal kommt eine Mannschaft, die sich weigert. Dann jage ich sie, weil das meine Pflicht ist. Und ich hoffe, dass sie schneller ist als ich.'],
  kw4_2: ['kessler', 'Wenn du eine Spieluhr findest … spiel sie mir vor. Ich habe das Lied vergessen.'],

  // ======================================================================
  // −111 Kathedrale · −333 Schlund · −666 Das Innere
  // ======================================================================
  oskar_1: ['oskar', 'Dreiunddreißig Jahre Nacht. Jede Nacht um drei Uhr sieben der Ruf.'],
  oskar_2: ['oskar', 'Ich hab nie abgenommen. Ich hab gezählt. Ich hab Gedichte geschrieben, die keiner lesen wollte.'],
  oskar_3: ['oskar', 'Dann hab ich einmal abgenommen, und am anderen Ende war jemand, der geweint hat.'],
  oskar_4: ['oskar', 'Ich wollte ihn holen. Deshalb bin ich hier. Ich bin nur nie unten angekommen.'],
  oskar_5: ['oskar', 'Hier. Das letzte Gedicht. Und nimm meine Laterne. Stell sie in die Kapelle, dann weiß ich, wo oben ist.'],
  v_e12_arrive:  ['chor', 'Der Schlund. Hier sind Kirche und Maschine und wir ein Leib geworden.'],
  v_e12_arrive2: ['vermittlerin', 'Verzeihen Sie. Es fällt uns schwer, nur eine zu sein, so nah am Grund.'],
  v_e13_arrive:  ['chor', 'Du bist in uns. Hörst du, wie viele wir sind?'],
  nia_1: ['nia', 'Jomo? Jomo, bist du das? Das Funkgerät geht noch!'],
  nia_2: ['nia', 'Ich hab die Tasten gedrückt, vier, zwei, sechs, zwei, zehn, fünf. Und dann ist eine Frau eingestiegen.'],
  nia_3: ['nia', 'Sie hat gefragt, wie ich heiße. Ich hab es ihr gesagt, Jomo. Ich war doch nur höflich.'],
  nia_4: ['nia', 'Sag Mama, dass es nicht wehtut. Es ist nur sehr, sehr voll hier drin.'],
  nia_5: ['nia', 'Du bist nicht Jomo. Aber du hast sein Funkgerät. Sag ihm … sag ihm, ich hab gewonnen. Beim Neunerspiel.'],

  // ======================================================================
  // FINALE −∞
  // ======================================================================
  c_e14_1:      ['chor', 'Willkommen, Mannschaft siebenundvierzig. Wir haben so lange gewartet.'],
  c_e14_2:      ['chor', 'Sieh sie dir an. Die Kabine von Mannschaft sechsundvierzig. Sieh nach, wer darin sitzt.'],
  c_e14_3:      ['chor', 'Er kam im Jahr sechshundertzwölf, um sie zu holen. Wir haben ihn behalten. Er schickt uns seitdem neue Kinder. Er meint es gut.'],
  c_e14_5:      ['chor', 'Sprecht eure Namen, und es hört auf. Keine Quote mehr. Keine Nacht. Kein Unten. Kein Oben.'],
  r_e14_1:      ['rauschen', 'Ihr müsst nicht. Hört ihr? Ihr müsst nicht. Das Seil. Brenners Schere. Ihr wisst, was ihr tun könnt.'],
  i_e14_1:      ['ilse', 'Oder ihr spielt mein Lied. Das erste, das sie gehört haben. Da werden sie ganz still.'],
  c_e14_forced: ['chor', 'Ihr habt ihn uns längst gesagt. Buchstabe für Buchstabe.'],
  d_ghost:      ['dieter', 'Ihr seid gekommen. Ihr seid wirklich gekommen. Sechsundvierzig … es tut mir so leid, Kinder.'],

  end_a_1: ['chor', 'Danke.'],
  end_a_2: ['vermittlerin', 'Vermittlung der Spindel. Mannschaft achtundvierzig, können Sie uns hören? Wir bleiben in der Leitung.'],
  end_b_1: ['chor', 'Nein. Nein, nein, nein, nicht das Seil—'],
  end_b_2: ['margarete', 'Danke. Es ist still.'],
  end_b_3: ['ilse', 'Es ist so leise. Ich kann das Meer hören.'],
  end_c_1: ['ilse', 'Papa hat das Lied vergessen. Ich nicht.'],
  end_c_2: ['ilse', 'Kommt. Die Treppe ist lang, aber oben ist Morgen.'],
  end_c_3: ['kessler', 'Ilse?'],
  end_c_4: ['ilse', 'Komm mit, Papa. Du musst die Tür nicht mehr halten.'],

  // ======================================================================
  // DER NACHSPRECHER – imitiert die Mannschaft (männlich/weiblich)
  // ======================================================================
  mm_1: ['crew_m', 'Hilfe! Hier drüben! Schnell!'],
  mm_2: ['crew_m', 'Ich hab was gefunden. Kommt mal her.'],
  mm_3: ['crew_m', 'Wo seid ihr? Ich seh euch nicht.'],
  mm_4: ['crew_m', 'Alles gut. Es ist weg. Kommt raus.'],
  mf_1: ['crew_f', 'Hilfe! Hier drüben! Schnell!'],
  mf_2: ['crew_f', 'Ich hab was gefunden. Kommt mal her.'],
  mf_3: ['crew_f', 'Wo seid ihr? Ich seh euch nicht.'],
  mf_4: ['crew_f', 'Alles gut. Es ist weg. Kommt raus.'],
};

// Kom-Nachrichten (Text)
export const KOM = {
  k_welcome: 'WILLKOMMEN IN MARKT NEUN, MANNSCHAFT 47. MELDET EUCH IN DER DISPOSITION. – D.',
  k_first:   'ERSTE FAHRT: NUR BIS −2. NICHTS ANFASSEN, WAS ATMET. – D.',
  k_lost:    'EUER SIGNAL SAGT −2. SCHÖN. NICHTS ANFASSEN, WAS ATMET. – D.',
  k_deep:    'EUER SIGNAL IST SCHWACH. ICH HÖRE EUCH TROTZDEM. ICH HÖRE IMMER. – D.',
  k_nosig:   'KEIN SIGNAL',
  k_47:      '47',
  k_home:    'KOMMT HEIM, KINDER.',
};

// Tafelsprüche (stumme Figuren)
export const SLATE = {
  anselm_hello: 'Guten Abend. Ich koche. Endlich isst jemand.',
  anselm_deep:  'Guten Abend. Ich koche. Niemand isst. Möchtest du kaufen?',
  anselm_1: 'Kerzen. Im Licht stehen sie still. Das weiß jeder, der lange genug hier ist.',
  anselm_2: 'Salz. Der Stein, der es sperrt. Streu es, und sie kommen nicht über die Linie.',
  anselm_3: 'Ich habe meinen Namen nicht gesagt. Da war ich schon im Aufzug. Seitdem bin ich halb.',
  anselm_4: 'Halb ist besser als nichts. Halb kann noch kochen.',
  anselm_5: 'Die Stimme im Telefon hat mich nie gemocht. Ich rede zu wenig.',
  anselm_6: 'Iss. Wer satt ist, hat weniger Angst. Das ist keine Weisheit, das ist Suppe.',
  anselm_7: 'Vierzig waren wir. Einer blieb. Jetzt zähle ich Gäste.',
  anselm_8: 'Wenn du meine Rezepte findest: Ich habe sie vergessen. Bitte erinnere mich.',
  anselm_dieter: '(Anselm schaut zur Disposition hinüber und schüttelt langsam den Kopf. Er schreibt nichts.)',
  anselm_come: 'Du nimmst mich mit? Nach oben? Ich war sechshundert Jahre nicht oben. Ist die Sonne noch da?',
  hanne_1: 'Willkommen. Hier sprechen wir nicht. Hier hört uns niemand.',
  hanne_2: 'Ich habe meine Stimme mit zwölf verkauft. Für Brot für drei Geschwister. Es war ein guter Handel. Sie leben alle drei.',
  hanne_3: 'Nimm die Kreide. Markiere deine Wege. Die Wände da unten vergessen schnell, aber Kreide vergisst nicht.',
  hanne_4: 'Wenn du alle unsere Gedichte findest, bringe ich dir etwas zurück, das dir gehört.',
  hanne_gift: 'Du hast alle Gedichte gefunden. Hier. Ein Buchstabe. Er war nie ihrer.',
  hanne_archive: 'Die Akten der Kantorin. Wenn du sie uns gibst, senden wir sie über den Piratensender. Die ganze Spindel wird es hören. Die Kanzlei wird es dir nicht verzeihen.',
  jomo_1: '(Jomo schreibt langsam.) Nia. Meine Schwester. Wir haben gespielt. Nur ich bin wieder ausgestiegen.',
  jomo_2: '(Er drückt dir ein Funkgerät in die Hand.) Wenn sie antwortet. Sag ihr, ich warte.',
  jomo_end: '(Jomo hört das Band mit Nias Stimme. Er schreibt nichts. Er lächelt zum ersten Mal.)',
};
