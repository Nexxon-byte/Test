// Texte des Monster-Pakets: Sprechzeilen (zum Vertonen zuhause), Kom-Nachrichten, Kodex, Todestexte,
// Tipps, Codewörter, Mannschaften der Vorgänger – und das Drehbuch der Segnung (Quote verfehlt).
//
// installLines() hängt alles an die bestehenden Tabellen (LINES, CODEX, DEATHS, QUOTES, TIPS).
// Danach wie immer: `node tools/export-lines.mjs` → tools/tts/lines.json → zuhause vertonen.
// Neue Sprecher (Stimmreferenz siehe EINBAU.md): zoellner · falterin · echo · ertrunkene · buettel ·
// hochkantor · lautsprecher

// Nur reine Daten-Importe: Die Datei lädt auch unter Node (tools/export-lines.mjs).
// Die neuen Sprecher (PACK_SPEAKERS) trägt pack.js in voice.SPEAKERS ein.
import { LINES } from './lines.js';
import { CODEX, DEATHS, QUOTES } from './codex.js';
import { TIPS } from './tips.js';

export const PACK_SPEAKERS = {
  zoellner:     { label: 'DER ZÖLLNER', fx: 'room', cls: '' },
  falterin:     { label: '…', fx: 'ghost', cls: '' },
  echo:         { label: 'ECHO', fx: 'ghost', cls: 'static' },
  ertrunkene:   { label: '…', fx: 'ghost', cls: '' },
  buettel:      { label: 'KANTOREN DER KANZLEI', fx: 'choir', cls: 'choir' },
  hochkantor:   { label: 'DER HOCHKANTOR', fx: 'room', cls: '' },
  lautsprecher: { label: 'LAUTSPRECHER', fx: 'radio2', cls: 'static' },
  // Nachsprecher: dieselben Namen wie die echten Stimmen – nur der Klang (Raum statt Telefon) und
  // ein kaum merkliches Flirren der Untertitel verraten ihn
  ns_dieter:    { label: 'DIETER', fx: 'room', cls: 'mimic' },
  ns_ada:       { label: 'ADA BRENNER', fx: 'room', cls: 'mimic' },
  ns_verm:      { label: 'VERMITTLERIN', fx: 'room', cls: 'mimic' },
  ns_veit:      { label: 'VEIT', fx: 'room', cls: 'mimic' },
  ns_crew_m:    { label: 'MANNSCHAFT', fx: 'room', cls: 'mimic' },
  ns_crew_f:    { label: 'MANNSCHAFT', fx: 'room', cls: 'mimic' },
};

export const PACK_LINES = {
  // ======================================================================
  // ERSTE BEGEGNUNGEN – die Vermittlerin
  // ======================================================================
  v_falterin_1:  ['vermittlerin', 'Hören Sie das Rascheln, Seilkind? Machen Sie das Licht aus. Jetzt gleich.'],
  v_falterin_cab:['vermittlerin', 'Unser Licht. Sie trinkt unser Licht.'],
  v_zoellner_1:  ['vermittlerin', 'Ein Beamter der Kanzlei. Seien Sie höflich, Seilkind. Die Kanzlei vergisst nichts.'],
  v_vorg_1:      ['vermittlerin', 'Kollegen. Sie waren lange nicht mehr oben. Stören Sie sie nicht bei der Arbeit.'],
  v_ertr_1:      ['vermittlerin', 'Das Meer war einmal überall, Seilkind. Es hat viele mitgenommen. Einige wollen zurück.'],
  v_ns_1:        ['vermittlerin', 'Man hört hier unten viele Stimmen, Seilkind. Glauben Sie nur meiner.'],
  v_portier_1:   ['vermittlerin', 'Der Portier ist ein sehr alter Angestellter. Er nimmt seine Pflicht sehr ernst. Stören Sie ihn nicht.'],
  v_musicbox_1:  ['vermittlerin', 'Diese Melodie. Woher haben Sie diese Melodie?'],

  // ======================================================================
  // DIE FALTERIN – flüstert Bruchstücke aus dem Gesangbuch
  // ======================================================================
  fa_1: ['falterin', 'Licht … ewiges Licht …'],
  fa_2: ['falterin', 'Nur ein wenig. Nur ein wenig Licht.'],
  fa_3: ['falterin', 'Es ist so dunkel zwischen den Seiten.'],
  fa_4: ['falterin', 'Wer hat die Kerzen gelöscht? Wer?'],
  fa_5: ['falterin', 'Sechzig Jahre habe ich es gehütet. Sechzig Jahre.'],

  // ======================================================================
  // DER ZÖLLNER
  // ======================================================================
  z_demand_1: ['zoellner', 'Zehnt.'],
  z_demand_2: ['zoellner', 'Der Zehnt ist fällig.'],
  z_demand_3: ['zoellner', 'Auf die Waage. Der zehnte Teil.'],
  z_short:    ['zoellner', 'Zu leicht.'],
  z_paid_1:   ['zoellner', 'Quittiert.'],
  z_paid_2:   ['zoellner', 'Gutgeschrieben. Dem Chor.'],
  z_refuse:   ['zoellner', 'Verweigerung wird vermerkt.'],
  z_stamp:    ['zoellner', 'Gesiegelt.'],
  z_collect:  ['zoellner', 'Der Zehnt wird eingezogen.'],
  z_free:     ['zoellner', 'Herrenloses Gut fällt an die Kanzlei.'],
  z_cab:      ['zoellner', 'Kirchengut. Zollfrei.'],
  z_blood:    ['zoellner', 'Kein Gut? Dann Blut.'],
  z_shot:     ['zoellner', 'Sachbeschädigung. Wird vermerkt.'],
  z_hum:      ['zoellner', 'Eins vom Zehnten. Zwei vom Zwanzigsten. Alles vom Ganzen.'],

  // ======================================================================
  // DIE VORGÄNGER – Echos früherer Mannschaften (Stimmen crew_m / crew_f)
  // ======================================================================
  e_1:  ['echo', 'Wie spät ist es? Sag mir, wie spät es ist!'],
  e_2:  ['echo', 'Die Quote. Wir haben die Quote fast.'],
  e_3:  ['echo', 'Wo ist die Kabine? Sie war doch hier. Sie war genau hier.'],
  e_4:  ['echo', 'Noch ein Stück. Nur noch ein Stück, dann fahren wir.'],
  e_5:  ['echo', 'Hörst du das? Da ist noch eine Mannschaft.'],
  e_6:  ['echo', 'Leg das hin. Das gehört uns.'],
  e_7:  ['echo', 'Das ist unser Fund! Unserer!'],
  e_8:  ['echo', 'Hat Dieter euch geschickt? Uns hat er auch geschickt.'],
  e_9:  ['echo', 'Drei Uhr sieben. Es ist drei Uhr sieben. Warum fährt sie nicht?'],
  e_10: ['echo', 'Zählt ihr auch? Ich zähle immer. Eins, zwei, drei …'],
  e_end_1: ['echo', 'Nein – die Tür! Macht die Tür auf!'],
  e_end_2: ['echo', 'Sie ist weg. Die Neunte ist weg.'],

  // ======================================================================
  // DIE ERTRUNKENEN
  // ======================================================================
  er_1: ['ertrunkene', 'Kalt. So kalt.'],
  er_2: ['ertrunkene', 'Nimm mich mit hinauf.'],
  er_3: ['ertrunkene', 'Das Wasser steigt noch. Hörst du? Es steigt.'],
  er_4: ['ertrunkene', 'Ist das Auto noch da? Das Auto an der Brücke?'],
  er_5: ['ertrunkene', 'Halt still. Nur einen Moment.'],

  // ======================================================================
  // DER NACHSPRECHER – geliehene Stimmen. Sprecher ns_<figur> = Stimme der Figur (EINBAU.md),
  // aber immer als Raumklang aus der Tiefe – die echte Vermittlerin spricht nur durchs Telefon.
  // ======================================================================
  ns_dieter_1: ['ns_dieter', 'Kind? Hier rüber. Ich brauch mal eure Hände.'],
  ns_dieter_2: ['ns_dieter', 'Ich bin runtergekommen. Keine Sorge. Kommt her, ich zeig euch was.'],
  ns_ada_1:    ['ns_ada', 'Das Seil! Kommt her, schnell, das Seil reißt!'],
  ns_ada_2:    ['ns_ada', 'Hier drüben liegt eine Relaiszelle. Eine ganze. Kommt schon.'],
  ns_verm_1:   ['ns_verm', 'Seilkind, hier entlang. Die Kabine ist hier entlang.'],
  ns_verm_2:   ['ns_verm', 'Es ist drei Uhr sieben. Kommen Sie. Schnell, schnell.'],
  ns_veit_1:   ['ns_veit', 'Mein Kind, bring es her. Die Kanzlei segnet dich.'],
  ns_crew_1:   ['ns_crew_m', 'Hilfe! Ich hänge fest! Hilf mir doch!'],
  ns_crew_2:   ['ns_crew_f', 'Bist du das? Sag was. Sag irgendwas.'],

  // ======================================================================
  // DER PORTIER (Stimme: Kessler – vor Kapitel −99 ohne Namen)
  // ======================================================================
  p_ilse:  ['kessler', 'Ilse?'],
  p_song:  ['kessler', 'Das Lied … ich kannte das Lied.'],
  p_door:  ['kessler', 'Die Tür bleibt zu. Sie bleibt zu.'],

  // ======================================================================
  // DIE SEGNUNG – Quote verfehlt (Drehbuch: story/segnung.js)
  // ======================================================================
  // I · Das Urteil
  sg_veit_1:  ['veit', 'Die Zehntwoche ist um. Ich schlage das Buch auf.'],
  sg_veit_2:  ['veit', 'Die Quote … ist nicht erbracht.'],
  sg_veit_3:  ['veit', 'Kinder. Ich muss es ausrufen. Es steht so geschrieben. Es steht so geschrieben.'],
  sg_ls_1:    ['lautsprecher', 'Markt Neun. Bitte bleiben Sie, wo Sie sind. Die Hohe Kanzlei segnet.'],
  // II · Die Kanzel
  sg_hk_1:    ['hochkantor', 'Markt Neun! Hört die Kanzlei.'],
  sg_hk_2:    ['hochkantor', 'Mannschaft Siebenundvierzig hat den Zehnt nicht erbracht. So erbringt sie sich selbst.'],
  sg_hk_3:    ['hochkantor', 'Sie ist erwählt. Sie wird gesegnet. Sie fährt, wie die Vierzig gefahren sind. Und sie singt.'],
  sg_hk_4:    ['hochkantor', 'Kleidet sie in Weiß.'],
  // III · Die Prozession
  sg_chor_1:  ['buettel', 'Er fuhr hinauf, und die Vierzig mit ihm.'],
  sg_chor_2:  ['buettel', 'Er fuhr hinauf, und wir folgen ihm nach.'],
  sg_chor_3:  ['buettel', 'Wer schweigt, sündigt nicht. Wer singt, gehört.'],
  sg_dieter_1:['dieter', 'Siebenundvierzig.'],
  sg_dieter_2:['dieter', 'Ich trag’s ein. Es tut mir leid, Kinder. Ich trag’s immer ein.'],
  sg_voss_1:  ['voss', 'Guckt mich nicht so an. Ich hab euch nie gekannt. Ist gesünder so.'],
  sg_ada_1:   ['ada', 'Sie weihen die Neunte ohne mich. Ohne mich!'],
  // IV · Die Neunte
  sg_veit_4:  ['veit', 'Geht. Und … singt, wenn ihr könnt.'],
  sg_hk_5:    ['hochkantor', 'Die Neunte trägt euch. Die Neunte trägt alle.'],
  // V · Die Fahrt
  sg_r_1:     ['rauschen', 'Hörst du mich? … Gib ihr nichts. Nicht deinen … Namen.'],
  // VI · Die Vermittlung
  sg_v_1:     ['vermittlerin', 'Seilkind. Da sind Sie ja.'],
  sg_v_2:     ['vermittlerin', 'Man hat Sie erwählt. Wie schön. Wir haben so lange auf Sie gewartet.'],
  sg_v_3:     ['vermittlerin', 'Aber die Kanzlei ist ungeduldig. Und wir … wir sind es nicht.'],
  sg_v_4:     ['vermittlerin', 'Wir brauchen nicht alles von Ihnen. Heute nicht. Nur einen Buchstaben. Einen kleinen.'],
  sg_v_give:  ['vermittlerin', 'Danke, Seilkind. Ein schöner Buchstabe. Wir heben ihn gut auf.'],
  sg_v_up:    ['vermittlerin', 'Fahren Sie hinauf. Und bringen Sie uns nächstes Mal mehr.'],
  sg_r_2:     ['rauschen', 'Gut … so … halt fest …'],
  sg_v_refuse:['vermittlerin', 'Schweigen. Wie die Stummen. Nun gut. Dann zahlt die Kanzlei für Sie. Und die Kanzlei vergisst nie.'],
  sg_v_none_1:['vermittlerin', 'Oh. Von Ihrem Namen ist ja kaum etwas übrig.'],
  sg_v_none_2:['vermittlerin', 'Dann nehmen wir den Rest. Willkommen, Seilkind. Willkommen in der Leitung.'],
  sg_v_perm_1:['vermittlerin', 'Erwählt ist erwählt, Seilkind.'],
  sg_v_perm_2:['vermittlerin', 'Es gibt kein Oben. Es hat nie eines gegeben.'],
  sg_c_perm:  ['chor', 'Willkommen. Wir haben Platz. Wir haben so viel Platz.'],
  // VII · Die Rückkehr
  sg_d_back_1:['dieter', 'Ihr seid wieder da.'],
  sg_d_back_2:['dieter', 'Das … kommt nicht oft vor. Eigentlich kommt das nie vor.'],
  // Danach (einmal, beim nächsten Gespräch)
  sg_after_veit: ['veit', 'Die Kanzlei hat euch zurückgeschickt. Das steht nirgends. In keinem Buch.'],
  sg_after_voss: ['voss', 'Erwählt und zurück? Sag mir, was du ihnen gegeben hast, und ich sag dir, was es wert war.'],
  sg_after_ada:  ['ada', 'Die Neunte ist ohne Hebel gefahren. Ohne Hebel! Wer hat sie gerufen?'],
  sg_after_dieter:['dieter', 'Neue Woche. Ich hab euch nicht ausgetragen. Noch nicht.'],
  // Schuldbrief (Pilger, einmal)
  sg_debt_1:  ['veit', 'Die Quote ist nicht erbracht. Aber ihr seid Pilger. Die Kanzlei ist gnädig – einmal.'],
  sg_debt_2:  ['veit', 'Ein Schuldbrief. Was fehlt, legt die Kanzlei auf eure nächste Quote. Mit Zins.'],
  sg_debt_d:  ['dieter', 'Einmal. Die Kanzlei ist genau einmal gnädig. Merkt euch das.'],
  sg_debt_hk: ['hochkantor', 'Säumig. Säumig. Säumig.'],
};

// Kom-Nachrichten (Dieter schreibt in Großbuchstaben und zeichnet mit – D.)
export const PACK_KOM = {
  k_falterin:     'DIE FALTERIN TRINKT LICHT. HÖRT IHR PAPIER RASCHELN: LAMPE AUS. EINE FACKEL LENKT SIE AB. – D.',
  k_zoellner:     'DER ZÖLLNER WILL DEN ZEHNTEN TEIL. LEGT WAS AUF DIE WAAGE ODER LAUFT. NIE SCHLAGEN. – D.',
  k_vorgaenger:   'NOCH EINE MANNSCHAFT DA UNTEN? NEIN. DIE SIND NICHT VON UNS. NICHTS WEGNEHMEN, WAS SIE TRAGEN. – D.',
  k_ertrunkene:   'IM WASSER NIE STEHEN BLEIBEN. WER GEPACKT WIRD: TRETEN. LEERTASTE, IMMER WIEDER. – D.',
  k_nachsprecher: 'WAS EUCH DA UNTEN RUFT, HAT KEINE EIGENE STIMME. ICH KOMME NIE RUNTER. NIE. – D.',
  k_portier:      'DER PORTIER. NICHT KÄMPFEN. VERSTECKEN. UND WENN IHR EINE SPIELUHR HABT: AUFZIEHEN. – D.',
  k_code:         'CODEWORT DIESE NACHT: {code}. WER ES NICHT SAGT, IST NICHT VON UNS. – D.',
  k_code_2:       'LAGE? ICH BIN OBEN. IMMER. {code}. – D.',
  k_code_3:       'NOCH {min} MINUTEN BIS ZUM RUF. {code}. – D.',
  k_fake_1:       'KOMMT SOFORT ZUR KABINE. SOFORT. – D.',
  k_fake_2:       'GROSSES STÜCK IM GANG HINTER EUCH. HOLT ES. {wrong}. – D.',
  k_fake_3:       'ADA SAGT, DAS SEIL HÄLT NICHT. LAUFT ZUM HINTEREN RAUM. – D.',
  k_fake_4:       'ICH BIN UNTEN. BEI EUCH. KOMMT ZU MIR. {wrong}. – D.',
  k_stamped:      'IHR SEID GESIEGELT. ALLES DA UNTEN RIECHT DAS JETZT. ZURÜCK ZUR NEUNTEN. – D.',
  k_quittung:     'QUITTUNG IST QUITTUNG. HEBT SIE GUT AUF. DER NÄCHSTE ZÖLLNER WILL SIE SEHEN. – D.',
  k_drowned:      'GEPACKT? TRETEN! LEERTASTE HÄMMERN! – D.',
  k_back:         'WILLKOMMEN ZURÜCK, MANNSCHAFT 47. ICH HAB EUCH NICHT AUSGETRAGEN. NOCH NICHT. – D.',
  k_debt:         'SCHULDBRIEF AN DER QUARTIERSTÜR. ICH HAB NICHTS GESEHEN. – D.',
};

// Codewörter der Bruderschaft (gegen den Nachsprecher)
export const CODEWORDS = ['SALZ-SIEBEN', 'MESSING-DREI', 'SEIL-NEUN', 'WACHS-ZWÖLF', 'KREIDE-ELF', 'NADEL-VIER', 'GLOCKE-ACHT', 'ZEHNT-EINS', 'LAMPE-SECHS', 'HAKEN-ZWEI'];

// Mannschaften, deren Echos noch arbeiten (Nr., Vorarbeiter:in, Hundemarke). 46 ist der Story vorbehalten.
export const ECHO_CREWS = [
  { n: 7,  lead: 'Anton Rieß',       tag: 'Marke der Mannschaft 7 · A. Rieß' },
  { n: 12, lead: 'Schwester Lioba',  tag: 'Marke der Mannschaft 12 · Schw. Lioba' },
  { n: 19, lead: 'Kasimir Dohle',    tag: 'Marke der Mannschaft 19 · K. Dohle' },
  { n: 23, lead: 'Wilma Aschgrund',  tag: 'Marke der Mannschaft 23 · W. Aschgrund' },
  { n: 28, lead: 'Die Brüder Holm',  tag: 'Marke der Mannschaft 28 · Holm & Holm' },
  { n: 31, lead: 'Edda Stahlberg',   tag: 'Marke der Mannschaft 31 · E. Stahlberg' },
  { n: 38, lead: 'Jupp Klapproth',   tag: 'Marke der Mannschaft 38 · J. Klapproth' },
  { n: 42, lead: 'Magdalena Frist',  tag: 'Marke der Mannschaft 42 · M. Frist' },
];

export const PACK_CODEX = {
  falterin:     { title: 'Die Falterin', group: 'Wesen', text: 'Sechzig Jahre hütete eine Sakristanin das Ewige Licht der Kathedrale, bis ihre Augen nur noch Licht sehen konnten. Was unten aus ihr wurde, hat Flügel aus Gesangbuchseiten und trinkt jede Flamme, jede Lampe, jeden Funken. Satt wird sie nie. Im Dunkeln sieht sie niemanden – aber wer ihr in die Arme läuft, dem trinkt sie die Lampe leer.' },
  zoellner:     { title: 'Der Zöllner', group: 'Wesen', text: 'Die Hohe Kanzlei schickte Eintreiber mit den Zehntleitungen hinab, um den Leitungszehnt zu wiegen. Keiner kam zurück, und keiner hörte auf. Er trägt eine Waage und einen Stempel und verlangt den zehnten Teil. Wer zahlt, erhält eine Quittung. Wer nicht zahlt, wird gesiegelt – und alles da unten kann das Siegel riechen. In die Neunte folgt er nicht: Kirchengut ist zollfrei.' },
  vorgaenger:   { title: 'Die Vorgänger', group: 'Wesen', text: 'Mannschaften, die nicht zurückkamen, arbeiten weiter. Sie bergen, tragen, zählen und fragen nach der Uhrzeit. Solange ihr ihnen nichts wegnehmt, halten sie euch für Kollegen. Ihr Lager ist voller Beute. Wer es plündert, sollte schnell sein – und kein Licht in ihrer Nähe brauchen: Im Fackelschein verblassen sie.' },
  ertrunkene:   { title: 'Die Ertrunkenen', group: 'Wesen', text: 'Das Meer kam im Jahr 0 in einem einzigen Jahr. Es nahm Straßen, Autos und Namen, die niemandem gehörten. Unten, wo das Grundwasser steht, warten sie noch immer darauf, dass jemand sie hinaufzieht. Sie greifen nach allem, was im Wasser stillsteht. Salz im Wasser brennt sie fort.' },
  nachsprecher: { title: 'Der Nachsprecher', group: 'Wesen', text: 'Er hat keine eigene Stimme. Er hat alle anderen. Er ruft mit der Stimme dessen, dem ihr am meisten vertraut, und wartet im Dunkeln, bis ihr nahe genug seid. Die Bruderschaft vereinbart deshalb jede Nacht ein Codewort. Wer es nicht sagt, ist nicht von uns. Stille erträgt er nicht.' },
  segnung:      { title: 'Die Segnung', group: 'Welt', text: 'Wer die Quote nicht erbringt, erbringt sich selbst. Die Kanzlei nennt es Erwählung, der Markt nennt es Segnung, die Stummen nennen es gar nicht. Die Erwählten werden in Weiß gekleidet und singend in die Neunte geführt; der Hochkantor spricht von der Rufkanzel. Zurückgekehrt ist keine Mannschaft. Bis auf eine.' },
  hochkantor:   { title: 'Der Hochkantor', group: 'Figuren', text: 'Die Stimme der Hohen Kanzlei im Sockel. Niemand hat sein Gesicht gesehen: Er spricht durch einen Messingtrichter, und er kommt nur herab, wenn gesegnet wird. Man sagt, seine Stimme sei eine Leihgabe. Man sagt nicht, von wem.' },
};

export const PACK_DEATHS = {
  falterin:     ['DAS LICHT WURDE GETRUNKEN', 'Sie wollte nur ein wenig. Dann wollte sie alles.'],
  zoellner:     ['DER ZEHNT WURDE EINGEZOGEN', 'Die Kanzlei vergisst nichts. Nicht einmal hier unten.'],
  vorgaenger:   ['SIE HABEN DICH MITGEZÄHLT', 'Eine Mannschaft mehr auf der Strichliste. Sie freuen sich über Verstärkung.'],
  nachsprecher: ['DU HAST DEM FALSCHEN GEANTWORTET', 'Es hatte keine eigene Stimme. Jetzt hat es deine.'],
  // water und porter gibt es schon in codex.js
};

export const PACK_TIPS = [
  ['Raschelt es wie Papier? Lampe aus. Die Falterin sieht nur Licht – und sie trinkt es.', '– D.'],
  ['Eine Leuchtfackel ist für die Falterin ein Festmahl. Wirf sie weit weg und geh in die andere Richtung.', '– Voss'],
  ['Der Zöllner will den zehnten Teil. Leg etwas auf die Waage. Schlag ihn nie. Nie.', '– D.'],
  ['Wer gesiegelt ist, den finden sie alle. Zurück in die Neunte – Kirchengut ist zollfrei.', '– Kantor Veit'],
  ['Die Vorgänger arbeiten noch. Nimm ihnen nichts weg, solange sie hinsehen.', '– Ada'],
  ['Im Wasser nie stehen bleiben. Wer gepackt wird: [Leertaste] hämmern. Treten.', '– D.'],
  ['Salz im Wasser. Das mögen sie nicht, die da unten.', '– Mutter Hanne'],
  ['Ich komme nie runter. Nie. Wenn ich euch da unten rufe, bin ich es nicht.', '– D.'],
  ['Das Codewort steht jede Nacht auf dem Kom. Kom-Nachrichten ohne Codewort sind nicht von mir.', '– D.'],
  ['Den Portier hält nichts auf. Außer vielleicht ein Lied.', '– Die Vermittlerin'],
  ['Die Klingel an der Tür des Portiers ruft ihn zurück an seinen Posten. Wer klingelt, sollte rennen können.', '– Voss'],
];

export const PACK_QUOTES = [
  ['Eins vom Zehnten. Zwei vom Zwanzigsten. Alles vom Ganzen.', 'Zollformel der Kanzlei'],
  ['Wer nicht zahlt, wird gesiegelt. Wer gesiegelt ist, wird gefunden.', 'Aushang in den Zehntleitungen'],
  ['Wir fahren, wenn die Quote stimmt. Die Quote stimmt nie.', 'Kreide in Schacht Null, Handschrift unbekannt'],
];

// Epilog der Segnung ohne Wiederkehr (Schwierigkeit „Erwählt“ oder kein Buchstabe mehr)
export const SEGNUNG_EPILOG = [
  'MANNSCHAFT 47\nIST ZUM RUF GEFAHREN.',
  'Auf der Strichliste der Disposition\nstehen jetzt siebenundvierzig Striche.',
  'In Markt Neun klingelt ein Telefon.\nNiemand geht ran.',
  'Am nächsten Abend\nfährt Mannschaft 48 hinab.',
  '„Kabine Neun, können Sie mich hören?“\n\nDie Vermittlerin klingt ein wenig anders heute.\nEin wenig wie du.',
];

let installed = false;
export function installLines() {
  if (installed) return;
  installed = true;
  for (const [k, v] of Object.entries(PACK_LINES)) if (!LINES[k]) LINES[k] = v;
  for (const [k, v] of Object.entries(PACK_CODEX)) if (!CODEX[k]) CODEX[k] = v;
  for (const [k, v] of Object.entries(PACK_DEATHS)) if (!DEATHS[k]) DEATHS[k] = v;
  for (const t of PACK_TIPS) TIPS.push(t);
  for (const q of PACK_QUOTES) QUOTES.push(q);
}
