// Händler-Panels, Auftragsbrett, Abrechnung der Nacht, Tafeln der Stummen.

import { ui } from './ui.js';
import { audio } from '../audio/audio.js';
import { voice, escapeHtml } from '../audio/voice.js';
import { input } from '../core/input.js';
import { MODULES, DEPTH_STAGES } from '../world/cab.js';
import { saveCampaign, quotaFor } from '../game/state.js';
import { SLATE } from '../story/lines.js';

const host = () => ui.menus();

function panel(id, html) {
  document.getElementById(id)?.remove();
  const s = document.createElement('div');
  s.id = id;
  s.className = 'screen active dim-bg interactive';
  s.innerHTML = html;
  host().appendChild(s);
  s.querySelectorAll('button').forEach(b => b.addEventListener('mouseenter', () => audio.play('uiHover')));
  return s;
}

function waitClose(s, onClose) {
  return new Promise((resolve) => {
    const done = () => { window.removeEventListener('keydown', key, true); s.remove(); input.lock(); onClose?.(); resolve(); };
    const key = (e) => { if (e.code === 'Escape' || e.code === 'KeyE' || e.code === 'Tab') { e.preventDefault(); e.stopPropagation(); done(); } };
    setTimeout(() => window.addEventListener('keydown', key, true), 150);
    s.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => { audio.play('uiSelect'); done(); }));
  });
}

// ---------------------------------------------------------------- Angebote

// Seilstufen (Hauptprogression) – Preis & Bedingung
export const STAGE_PRICES = { 2: 450, 3: 1100, 4: 2000, 5: 3200, 6: 5000 };

const MODULE_SHOP = {
  flutlicht:    { price: [120], desc: 'Scheinwerfer über dem Tor. Im Licht erstarren die Fahrgäste.' },
  rufglocke:    { price: [60], desc: 'Ruft die Mannschaft zurück. Ruft auch alles andere.' },
  lastregal:    { price: [90], desc: 'Mehr Stauraum. Was im Regal liegt, wird sicher gezählt.' },
  weihoel:      { price: [160], desc: 'Heilt in der Kabine. Riecht nach Kirche und Verband.' },
  notstrom:     { price: [140], desc: 'Das Kabinenlicht bleibt an, wenn unten alles ausgeht.' },
  panzergitter: { price: [150, 280], desc: 'Stärkeres Gitter. Stufe II hält auch den Hörer draußen.' },
  horchgeraet:  { price: [220], desc: 'Radarschirm: Bewegung im Umkreis von 30 Metern.' },
  salzkanone:   { price: [320], desc: 'Automatisches Geschütz am Tor. Salz gegen alles, was aus der Tiefe kommt.' },
  kessel:       { price: [200], need: 'anselm', desc: 'Anselms Suppe vor dem Aussteigen: mehr Ausdauer für die Nacht.' },
  neon:         { price: [45], desc: 'Neon-Schriftzug „Die Neunte“. Schön ist wichtig.' },
  radio:        { price: [40], desc: 'Knistert Musik aus der Krone. Manchmal etwas anderes.' },
  pluesch:      { price: [30], desc: 'Ein Plüsch-Erbauer. Er schaut immer zur Tür.' },
};

const TOOL_SHOP = {
  lampe:  { name: 'Lampe · Reichweite', price: [80, 160, 280], desc: 'Größerer Reflektor, weiterer Kegel.' },
  akku:   { name: 'Lampe · Akku', price: [60, 120, 220], desc: 'Hält länger, bevor du kurbeln musst.' },
  lunge:  { name: 'Atemschlauch', price: [70, 140, 240], desc: 'Längeres Rennen.' },
  sohlen: { name: 'Filzsohlen', price: [90, 180], desc: 'Leisere Schritte. Der Hörer wird es dir danken. Oder eben nicht.' },
};

function card({ title, lvl = '', desc, cost, can, btn = 'KAUFEN', id, cls = '' }) {
  return `<div class="card ${cls}"><h4>${escapeHtml(title)}</h4>${lvl ? `<div class="lvl">${lvl}</div>` : ''}<p>${escapeHtml(desc)}</p>
    <div class="cost ${can ? '' : 'no'}">${cost}</div><button class="btn" data-buy="${id}" ${can ? '' : 'disabled'}>${btn}</button></div>`;
}

export async function openShop(kind, game) {
  const st = game.state;
  const render = () => {
    let title = '', sub = '', cards = '', speech = '';
    if (kind === 'ada') {
      title = 'WERKSTATT BRENNER'; sub = 'Ada baut die Neunte aus. Bezahlt wird in Marken.';
      const next = st.stage + 1;
      if (STAGE_PRICES[next]) {
        const p = STAGE_PRICES[next];
        cards += card({ id: 'stage', title: `Seilstufe ${DEPTH_STAGES[next].label}`, lvl: DEPTH_STAGES[next].sub, desc: 'Mehr Seil. Mehr Tiefe. Mehr Wert – und mehr, das zuhört.', cost: `${p} M`, can: st.marks >= p, cls: 'gift' });
      }
      for (const [id, m] of Object.entries(MODULE_SHOP)) {
        const lv = st.modules[id] || 0, max = MODULES[id].max;
        if (lv >= max) { cards += card({ id, title: MODULES[id].name, lvl: max > 1 ? `STUFE ${lv}/${max}` : 'EINGEBAUT', desc: m.desc, cost: '—', can: false, btn: 'EINGEBAUT' }); continue; }
        if (m.need && !st.flags[m.need]) continue;
        const p = m.price[lv];
        cards += card({ id, title: MODULES[id].name, lvl: max > 1 ? `STUFE ${lv + 1}/${max}` : '', desc: m.desc, cost: `${p} M`, can: st.marks >= p });
      }
      for (const [id, t] of Object.entries(TOOL_SHOP)) {
        const lv = st.tools[id] || 0;
        if (lv >= t.price.length) continue;
        const p = t.price[lv];
        cards += card({ id: 'tool:' + id, title: t.name, lvl: `STUFE ${lv + 1}/${t.price.length}`, desc: t.desc, cost: `${p} M`, can: st.marks >= p });
      }
    } else if (kind === 'voss') {
      title = 'VOSS · SCHWARZMARKT'; sub = 'Waffen, Heißware, Dinge ohne Kirchensiegel.';
      speech = '„Die Waffenlieferung steckt noch im Schacht fest. Komm morgen wieder. Oder übermorgen. Voss hält Wort, irgendwann.“';
      cards += card({ id: 'x', title: 'Salzflinte', desc: 'Zwei Schuss Salz, laut wie das Jüngste Gericht.', cost: 'BALD', can: false, btn: 'NICHT DA' });
      cards += card({ id: 'x', title: 'Leuchtfackel', desc: 'Im Licht erstarren sie. Wirf weit.', cost: 'BALD', can: false, btn: 'NICHT DA' });
      cards += card({ id: 'x', title: 'Klapper', desc: 'Macht Lärm, wo du nicht bist.', cost: 'BALD', can: false, btn: 'NICHT DA' });
    } else if (kind === 'veit') {
      title = 'KANTOREI-ANNAHME'; sub = 'Leg Bergegut auf die Waage, um es zu verkaufen. Hier wird die Quote abgerechnet.';
      const left = Math.max(0, st.quota - st.sold);
      speech = st.night >= 3
        ? `„Die Zehntwoche ${st.week} ist vorüber. Die Kanzlei erwartet ${st.quota} Marken. Ihr habt ${st.sold} übergeben.“`
        : `„Noch ${3 - st.night} Nächte in dieser Zehntwoche. Es fehlen ${left} Marken zur Quote.“`;
      if (st.night >= 3) cards += card({ id: 'week', title: 'Woche abschließen', desc: st.sold >= st.quota ? 'Die Quote ist erfüllt. Die Kanzlei zahlt einen Bonus für jeden Überschuss.' : 'Die Quote ist NICHT erfüllt. Die Kantoren werden kommen.', cost: `${st.sold} / ${st.quota} M`, can: true, btn: 'ABRECHNEN', cls: st.sold >= st.quota ? '' : 'gift' });
    } else if (kind === 'anselm') {
      title = 'ANSELMS GARKÜCHE'; sub = 'Der Koch schreibt auf eine Schiefertafel.';
      speech = `<div class="slate">${escapeHtml(SLATE.anselm_hello)}</div>`;
    }
    const html = `<div class="panel">
      <h2>${title}</h2><div class="sub">${sub}</div>
      <div class="wallet"><span>MARKEN: ${st.marks}</span><span>QUOTE: ${st.sold} / ${st.quota}</span><span>WOCHE ${st.week} · NACHT ${Math.min(3, st.night + 1)}/3</span></div>
      ${speech && !speech.startsWith('<') ? `<p class="hintline" style="font-size:20px;margin-bottom:16px">${escapeHtml(speech)}</p>` : speech}
      <div class="grid">${cards || '<p class="hintline">Hier gibt es gerade nichts zu kaufen.</p>'}</div>
      <div class="btn-row"><button class="btn ghost" data-close>SCHLIESSEN [E]</button></div></div>`;
    if (!shopEl) shopEl = panel('shop', html); else shopEl.innerHTML = html;
    shopEl.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => buy(b.dataset.buy)));
    shopEl.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => { audio.play('uiSelect'); closeFn(); }));
    shopEl.querySelectorAll('button').forEach(b => b.addEventListener('mouseenter', () => audio.play('uiHover')));
  };

  const buy = (id) => {
    if (id === 'stage') {
      const next = st.stage + 1, p = STAGE_PRICES[next];
      if (st.marks < p) return;
      st.marks -= p; st.stage = next;
      game.elev.setUnlockedStages(st.stage + 1);
      voice.say('a_seil', { interrupt: true });
    } else if (id === 'week') {
      const r = game.closeWeek();
      ui.toast(r.ok ? `Quote erfüllt · Bonus +${r.bonus} M · Neue Quote: ${st.quota} M` : 'Quote verfehlt. Die Kantoren nehmen die Hälfte eurer Marken und alles Bergegut.');
    } else if (id.startsWith('tool:')) {
      const t = id.slice(5), lv = st.tools[t] || 0, p = TOOL_SHOP[t].price[lv];
      if (st.marks < p) return;
      st.marks -= p; st.tools[t] = lv + 1;
      game._applyCampaignToCab();
      voice.say(Math.random() < 0.5 ? 'a_buy_1' : 'a_buy_2', { interrupt: true });
    } else if (MODULE_SHOP[id]) {
      const lv = st.modules[id] || 0, p = MODULE_SHOP[id].price[lv];
      if (st.marks < p) { voice.say('a_poor', { interrupt: true }); return; }
      st.marks -= p; st.modules[id] = lv + 1;
      game.elev.setModule(id, lv + 1);
      game._rebuildCabEntries();
      voice.say(Math.random() < 0.5 ? 'a_buy_1' : 'a_buy_2', { interrupt: true });
    } else return;
    audio.play('ding', { vol: 0.3, pitch: 1.3 });
    saveCampaign(st);
    render();
  };

  let shopEl = null, closeFn = null;
  await new Promise((resolve) => {
    const key = (e) => { if (e.code === 'Escape' || e.code === 'KeyE' || e.code === 'Tab') { e.preventDefault(); e.stopPropagation(); closeFn(); } };
    closeFn = () => { window.removeEventListener('keydown', key, true); shopEl?.remove(); input.lock(); resolve(); };
    render();
    setTimeout(() => window.addEventListener('keydown', key, true), 150);
  });
}

// ---------------------------------------------------------------- Auftragsbrett

export async function openBoard(game) {
  const st = game.state;
  const stages = [];
  for (let i = 1; i <= st.stage; i++) stages.push(`<li><b>Stufe ${DEPTH_STAGES[i].label}</b> · ${DEPTH_STAGES[i].sub}</li>`);
  const s = panel('board', `<div class="panel">
    <h2>DISPOSITION</h2><div class="sub">Bruder Dieter · Auftragsbrett der Bruderschaft vom Seil</div>
    <div class="wallet"><span>MARKEN: ${st.marks}</span><span>QUOTE: ${st.sold} / ${st.quota}</span><span>WOCHE ${st.week} · NACHT ${Math.min(3, st.night + 1)}/3</span></div>
    <h3>SO LÄUFT DAS</h3>
    <p class="hintline" style="font-size:19px;font-style:normal;color:var(--bone)">
      1. In der Neunten den <b>Telegrafen</b> auf eine freigeschaltete Tiefenstufe stellen, dann den <b>Knopf</b> drücken.<br>
      2. Unten: Bergegut finden (<b>Q</b> scannen), in die Kabine tragen. Nur was in der Kabine liegt, zählt.<br>
      3. Vor <b>03:07</b> zurück, <b>AUFWÄRTS</b> drücken. Um 03:07 fährt die Neunte ohne euch.<br>
      4. Oben die Beute zur <b>Waage der Kantorei</b> tragen. Nach 3 Nächten rechnet Kantor Veit die Quote ab.</p>
    <h3>FREIGESCHALTET</h3><ul class="players">${stages.join('')}</ul>
    <h3>NÄCHSTE ZEHNTWOCHE</h3><p class="hintline">Woche ${st.week + 1}: Quote ${quotaFor(st.week + 1, st.difficulty)} M. Tiefere Stufen bringen mehr. Ada verkauft mehr Seil.</p>
    <div class="btn-row"><button class="btn ghost" data-close>SCHLIESSEN [E]</button></div></div>`);
  await waitClose(s);
}

// ---------------------------------------------------------------- Abrechnung der Nacht

export async function nightReport(r) {
  const groups = new Map();
  for (const it of r.brought) {
    const g = groups.get(it.def.name) || { n: 0, v: 0 };
    g.n++; g.v += it.value; groups.set(it.def.name, g);
  }
  const rows = [...groups.entries()].map(([n, g]) => `<li><span>${g.n}× ${escapeHtml(n)}</span><span>${g.v} M</span></li>`).join('') || '<li><span>Nichts.</span><span>0 M</span></li>';
  const s = panel('report', `<div class="panel report">
    <h2>ABRECHNUNG DER NACHT</h2>
    <div class="sub">${escapeHtml(r.name || '')} · −${r.depth} · ${r.reason === 'ruf' ? 'Die Neunte fuhr um 03:07 von selbst.' : 'Rechtzeitig aufwärts.'}</div>
    <h3>IN DER KABINE</h3><ul class="players">${rows}</ul>
    <div class="total"><span>SUMME</span><span>${r.broughtValue} M</span></div>
    ${r.lost ? `<h3 style="color:var(--blood-hi)">VERSCHOLLEN</h3><p class="hintline">Du bist unten geblieben. Getragene Beute verloren: ${r.lostValue} M. Bestattungsgebühr der Bruderschaft: −${r.deathFee} M.<br>Die Kanzlei holt dich trotzdem zurück. Sie braucht jede Hand.</p>` : ''}
    <h3>ZEHNTWOCHE ${r.week}</h3>
    <p class="hintline" style="font-style:normal;color:var(--bone)">Nacht ${r.night} von 3 · verkauft ${r.sold} / ${r.quota} M · Fracht in der Kabine: ${r.cargoValue} M</p>
    ${r.tutorial ? '<p class="hintline">Trag die Beute aus der Kabine zur <b>Waage der Kantorei</b> (rechts vorne) und verkaufe sie mit <b>E</b>, während du sie hältst.</p>' : ''}
    <div class="btn-row"><button class="btn" data-close>WEITER</button></div></div>`);
  audio.play('stinger', { kind: 'soft', vol: 0.4 });
  await waitClose(s);
}

// ---------------------------------------------------------------- Tafel der Stummen

export function showSlate(who, text, cls = '') {
  const s = panel('slatebox', `<div class="panel" style="width:min(640px,92vw)">
    <h2 style="font-size:26px">${escapeHtml(who)}</h2>
    <div class="slate" style="margin-top:14px">${escapeHtml(text)}</div>
    <div class="btn-row"><button class="btn ghost" data-close>[E]</button></div></div>`);
  input.unlock();
  return waitClose(s);
}
