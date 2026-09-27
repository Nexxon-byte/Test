// Tagebuch (Tab): Aufträge · Kodex · Dokumente · Strichliste.
// Ein ledergebundenes Kontorbuch mit Messingecken; rechts liegen Papierseiten im Stil des jeweiligen Fundstücks.
// Öffnen: Tab im Markt und in der Nacht (game.js), oder aus dem Pausenmenü (app.js). Schließen: Tab/Esc/E.

import { ui } from './ui.js';
import { audio } from '../audio/audio.js';
import { escapeHtml } from '../audio/voice.js';
import { input } from '../core/input.js';
import { CODEX } from '../story/codex.js';
import { DOCS } from '../story/docs.js';
import { KINDS } from '../game/contracts.js';
import { DEPTH_STAGES } from '../world/cab.js';
import { saveCampaign, quotaFor, nameWithLetters } from '../game/state.js';
import { codexOpen, docText, docGroup, groupInfo, groupDocs, GROUP_ORDER, DOC_CODEX } from '../game/documents.js';

const TABS = [
  { id: 'auftraege', label: 'AUFTRÄGE', num: 'I' },
  { id: 'kodex', label: 'KODEX', num: 'II' },
  { id: 'dokumente', label: 'DOKUMENTE', num: 'III' },
  { id: 'strichliste', label: 'STRICHLISTE', num: 'IV' },
];
const CODEX_GROUPS = ['Welt', 'Fraktionen', 'Figuren', 'Geschichte', 'Technik', 'Wesen', 'Wahrheit'];
const PAPER = { hand: 'hand', church: 'church', terminal: 'terminal', chalk: 'chalk', tape: 'tape', child: 'child', note: '' };

let lastTab = 'auftraege';
const lastSel = {};
let openEl = null;

export function isJournalOpen() { return !!openEl; }

export function openJournal(game, { fromPause = false, tab = null } = {}) {
  if (openEl) return Promise.resolve();
  const st = game.state;
  const seen = new Set(st.journalSeen || []);
  let cur = tab || lastTab;
  let model = null;

  return new Promise((resolve) => {
    const s = document.createElement('div');
    s.id = 'journal';
    s.className = 'screen active dim-bg interactive';
    ui.menus().appendChild(s);
    openEl = s;
    audio.play('paper', { vol: 0.5 });

    const close = () => {
      window.removeEventListener('keydown', key, true);
      s.remove();
      openEl = null;
      st.journalSeen = [...seen];
      saveCampaign(st);
      audio.play('paper', { vol: 0.25 });
      if (!fromPause) input.lock();
      resolve();
    };

    const setTab = (id) => {
      if (id === cur) return;
      cur = lastTab = id;
      audio.play('paper', { vol: 0.35 });
      render();
    };

    const select = (k, sound = true) => {
      const it = model.items.find(i => i.key === k && !i.disabled);
      if (!it) return;
      lastSel[cur] = k;
      if (it.seenKey) seen.add(it.seenKey);
      for (const b of s.querySelectorAll('.list button[data-key]')) b.classList.toggle('sel', b.dataset.key === k);
      const btn = s.querySelector(`.list button[data-key="${CSS.escape(k)}"]`);
      btn?.querySelector('.dot')?.remove();
      btn?.scrollIntoView?.({ block: 'nearest' });
      const view = s.querySelector('.view');
      view.innerHTML = model.view(k);
      view.scrollTop = 0;
      // Reiter-Punkt aktualisieren
      const tb = s.querySelector(`.tabs button[data-tab="${cur}"] .dot`);
      if (tb && !model.items.some(i => i.seenKey && !seen.has(i.seenKey) && i.isNew)) tb.remove();
      if (sound) audio.play('paper', { vol: 0.2 });
    };

    const move = (dir) => {
      const list = model.items.filter(i => !i.disabled);
      if (!list.length) return;
      const i = list.findIndex(x => x.key === lastSel[cur]);
      select(list[Math.max(0, Math.min(list.length - 1, (i < 0 ? 0 : i + dir)))].key);
    };

    const render = () => {
      model = buildTab(cur, game, seen);
      const who = `MANNSCHAFT ${st.crew || 47} · ${escapeHtml(nameWithLetters(st.name, st.letters || 0))} · WOCHE ${st.week} · NACHT ${Math.min(3, st.night + 1)}/3`;
      const tabs = TABS.map(t => `<button data-tab="${t.id}" class="${t.id === cur ? 'sel' : ''}"><i>${t.num}</i>${t.label}${tabHasNew(t.id, game, seen) ? '<b class="dot"></b>' : ''}</button>`).join('');
      let body;
      if (model.single) body = `<div class="cols single"><div class="view single">${model.view()}</div></div>`;
      else {
        let list = '', grp = null;
        for (const it of model.items) {
          if (it.group !== grp) {
            grp = it.group;
            const cnt = model.counts?.[grp];
            list += `<div class="grp"><span>${escapeHtml(grp)}</span>${cnt ? `<em>${cnt}</em>` : ''}</div>`;
          }
          list += `<button data-key="${escapeHtml(it.key)}" class="${it.cls || ''}" ${it.disabled ? 'disabled' : ''}>`
            + `<span class="mk">${it.mark || ''}</span><span class="lb">${escapeHtml(it.label)}${it.isNew && !seen.has(it.seenKey) ? '<b class="dot"></b>' : ''}</span>`
            + `${it.sub ? `<small>${escapeHtml(it.sub)}</small>` : ''}</button>`;
        }
        body = `<div class="cols"><div class="list">${list || '<p class="hintline">Noch leer.</p>'}</div><div class="view"></div></div>`;
      }
      s.innerHTML = `<div class="panel book">
        <div class="jhead"><div class="ttl"><h2>TAGEBUCH</h2><div class="who">${who}</div></div><div class="tabs">${tabs}</div></div>
        ${body}
        <div class="foot">[TAB] SCHLIESSEN · [1–4] REITER · [↑↓] BLÄTTERN</div></div>`;
      s.querySelectorAll('.tabs button').forEach(b => {
        b.addEventListener('click', () => setTab(b.dataset.tab));
        b.addEventListener('mouseenter', () => audio.play('uiHover'));
      });
      s.querySelectorAll('.list button[data-key]').forEach(b => {
        b.addEventListener('click', () => select(b.dataset.key));
        b.addEventListener('mouseenter', () => audio.play('uiHover'));
      });
      if (!model.single) {
        const want = lastSel[cur] && model.items.some(i => i.key === lastSel[cur] && !i.disabled) ? lastSel[cur] : model.items.find(i => !i.disabled)?.key;
        if (want) select(want, false);
        else s.querySelector('.view').innerHTML = model.empty || '';
      }
    };

    const key = (e) => {
      const c = e.code;
      if (['Tab', 'Escape', 'KeyE', 'KeyJ'].includes(c)) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) close(); return; }
      if (/^Digit[1-4]$/.test(c)) setTab(TABS[Number(c.slice(5)) - 1].id);
      else if (c === 'ArrowLeft' || c === 'KeyA' || c === 'KeyQ') setTab(TABS[(TABS.findIndex(t => t.id === cur) + TABS.length - 1) % TABS.length].id);
      else if (c === 'ArrowRight' || c === 'KeyD') setTab(TABS[(TABS.findIndex(t => t.id === cur) + 1) % TABS.length].id);
      else if (c === 'ArrowUp' || c === 'KeyW') move(-1);
      else if (c === 'ArrowDown' || c === 'KeyS') move(1);
      else if (c === 'PageDown' || c === 'Space') { const v = s.querySelector('.view'); if (v) v.scrollTop += v.clientHeight * 0.8; }
      else if (c === 'PageUp') { const v = s.querySelector('.view'); if (v) v.scrollTop -= v.clientHeight * 0.8; }
      else return;
      e.preventDefault(); e.stopPropagation();
    };

    render();
    setTimeout(() => window.addEventListener('keydown', key, true), 120);
  });
}

// Neues (ungelesenes) im Reiter?
function tabHasNew(id, game, seen) {
  const st = game.state;
  if (id === 'kodex') return (st.codex || []).some(c => CODEX[c] && !seen.has('c:' + c));
  if (id === 'dokumente') return (st.docs || []).some(d => DOCS[d] && !seen.has('d:' + d));
  return false;
}

function buildTab(id, game, seen) {
  if (id === 'kodex') return codexTab(game);
  if (id === 'dokumente') return docsTab(game);
  if (id === 'strichliste') return tallyTab(game);
  return contractsTab(game);
}

// ============================================================================ I · Aufträge

const FLAVOR_OK = ['Abgezeichnet. Am Rand, in Dieters krakeliger Schrift: „Gut.“', 'Abgezeichnet und gestempelt. Jemand hat einen Kaffeering daneben hinterlassen.', 'Erledigt. Die Disposition hat es ohne Kommentar abgeheftet.'];
const FLAVOR_NO = ['Am Rand steht nichts. Das ist schlimmer als ein Fluch.', 'Verfehlt. Dieter hat den Zettel nicht weggeworfen. Er hat ihn umgedreht.', 'Verfehlt. Die Kanzlei hat es notiert. Die Kanzlei notiert alles.'];

function contractsTab(game) {
  const st = game.state;
  const items = [{ key: 'ov', label: 'Übersicht', group: `ZEHNTWOCHE ${st.week}`, mark: '§' }];
  for (const c of st.contracts || []) items.push({ key: 'a:' + c.id, label: c.title, sub: `−${c.floor?.[1] ?? '?'} · +${c.reward} M`, group: 'ANGENOMMEN', mark: KINDS[c.kind]?.gold ? '✦' : '◆', cls: KINDS[c.kind]?.gold ? 'gold' : '' });
  const log = (st.contractLog || []).map((e, i) => ({ ...e, i })).reverse();
  for (const e of log) items.push({
    key: 'l:' + e.i, label: e.title, group: `VERLAUF · WOCHE ${e.week}`,
    sub: e.ok ? `+${e.reward} M` : e.skipped ? 'verfallen' : 'verfehlt',
    mark: e.ok ? '✓' : e.skipped ? '–' : '✗', cls: e.ok ? 'ok' : 'no',
  });
  const view = (k) => {
    if (k === 'ov') return overviewPage(game);
    if (k.startsWith('a:')) return contractPage(game, (st.contracts || []).find(c => 'a:' + c.id === k));
    const e = (st.contractLog || [])[Number(k.slice(2))];
    return logPage(e);
  };
  return { items, view };
}

function overviewPage(game) {
  const st = game.state;
  const log = st.contractLog || [];
  const ok = log.filter(e => e.ok), no = log.filter(e => !e.ok && !e.skipped), skip = log.filter(e => e.skipped);
  const pay = ok.reduce((s, e) => s + (e.reward || 0), 0);
  const acc = st.contracts || [];
  const accHtml = acc.length
    ? `<ul class="lines">${acc.map(c => `<li><span>◆ ${escapeHtml(c.title)}</span><span>−${c.floor?.[1] ?? '?'} · +${c.reward} M</span></li>`).join('')}</ul>`
    : `<p class="typed">${st.flags?.tutorial ? 'Erste Nacht: nur die Ladebucht, −2. Aufträge gibt es ab morgen.' : 'Keine Aufträge angenommen. Das Brett hängt bei Bruder Dieter in der Disposition.'}</p>`;
  const pct = Math.min(100, Math.round((st.sold / Math.max(1, st.quota)) * 100));
  return `<div class="page">
    <div class="kicker">DISPOSITION SOCKEL-OST · AUFTRAGSBUCH</div>
    <h3>Zehntwoche ${st.week}</h3>
    <div class="meta">Nacht ${Math.min(3, st.night + 1)} von 3 · Marken ${st.marks}</div>
    <div class="quota"><span>QUOTE DER KANZLEI</span><div class="bar"><i style="width:${pct}%"></i></div><b>${st.sold} / ${st.quota} M</b></div>
    <h4>ANGENOMMEN</h4>${accHtml}
    <h4>BILANZ</h4>
    <ul class="lines"><li><span>Erfüllt</span><span>${ok.length}</span></li><li><span>Verfehlt</span><span>${no.length}</span></li><li><span>Verfallen</span><span>${skip.length}</span></li><li><span>Belohnungen</span><span>${pay} M</span></li></ul>
    <p class="margin">„Nicht mehr als zwei auf einmal. Und kommt zurück.“ – D.</p>
  </div>`;
}

function contractPage(game, c) {
  if (!c) return '';
  const k = KINDS[c.kind] || { label: c.kind, from: '' };
  const run = game.mode === 'night' ? game.contracts?.active?.find(a => a.id === c.id) : null;
  const done = run ? game.contracts.isDone(run) : false;
  const stamp = run ? (done ? '<div class="stamp ok">ERFÜLLT</div>' : '<div class="stamp gold">IN ARBEIT</div>') : '<div class="stamp gold">ANGENOMMEN</div>';
  const stage = DEPTH_STAGES[c.stage];
  return `<div class="page ${k.gold ? 'goldline' : ''}">${stamp}
    <div class="kicker">${escapeHtml(k.label)} · ${escapeHtml(k.from)}</div>
    <h3>${escapeHtml(c.title)}</h3>
    <div class="meta">−${c.floor?.[1] ?? '?'} · ${escapeHtml(c.floor?.[2] || '')}${stage ? ` · Tiefenstufe ${stage.label}` : ''}</div>
    <p class="typed">${escapeHtml(c.text || '')}</p>
    <ul class="lines"><li><span>Belohnung</span><span>+${c.reward} M</span></li></ul>
    ${run ? '<p class="margin">Der Kom zeigt die Richtung. Golden gezeichnet.</p>' : '<p class="margin">Am Telegrafen die richtige Tiefenstufe einstellen.</p>'}
  </div>`;
}

function logPage(e) {
  if (!e) return '';
  const k = KINDS[e.kind] || { label: e.kind || '', from: '' };
  const pick = (arr) => arr[(e.title.length + (e.week || 0) * 3 + (e.night || 0)) % arr.length];
  const stamp = e.ok ? '<div class="stamp ok">ERFÜLLT</div>' : e.skipped ? '<div class="stamp grey">VERFALLEN</div>' : '<div class="stamp">VERFEHLT</div>';
  const note = e.ok ? pick(FLAVOR_OK) : e.skipped ? 'Nicht angetreten. Der Zettel ist vergilbt, bevor jemand ihn abholen konnte.' : pick(FLAVOR_NO);
  return `<div class="page">${stamp}
    <div class="kicker">${escapeHtml(k.label)} · ${escapeHtml(k.from)}</div>
    <h3>${escapeHtml(e.title)}</h3>
    <div class="meta">Zehntwoche ${e.week} · Nacht ${e.night}</div>
    <ul class="lines"><li><span>Ergebnis</span><span>${e.ok ? 'erfüllt' : e.skipped ? 'verfallen' : 'verfehlt'}</span></li><li><span>Belohnung</span><span>${e.ok ? '+' + e.reward + ' M' : '—'}</span></li></ul>
    <p class="margin">${escapeHtml(note)}</p>
  </div>`;
}

// ============================================================================ II · Kodex

function codexTab(game) {
  const st = game.state;
  const items = [], counts = {};
  for (const grp of CODEX_GROUPS) {
    const ids = Object.keys(CODEX).filter(id => CODEX[id].group === grp);
    if (!ids.length) continue;
    const open = ids.filter(id => codexOpen(st, id));
    if (grp === 'Wahrheit' && !open.length) continue;   // die Wahrheit zeigt sich erst, wenn man sie berührt
    counts[grp.toUpperCase()] = `${open.length}/${ids.length}`;
    for (const id of ids) {
      const on = codexOpen(st, id);
      items.push(on
        ? { key: id, label: CODEX[id].title, group: grp.toUpperCase(), seenKey: 'c:' + id, isNew: (st.codex || []).includes(id), mark: '·' }
        : { key: id, label: '· · · · ·', group: grp.toUpperCase(), disabled: true, mark: '' });
    }
  }
  const view = (id) => {
    const e = CODEX[id];
    if (!e) return '';
    const stamp = e.group === 'Wesen' ? '<div class="stamp">GESICHTET</div>' : e.group === 'Wahrheit' ? '<div class="stamp">VERBOTEN</div>' : '';
    const src = Object.entries(DOC_CODEX).find(([d, list]) => list.includes(id) && (st.docs || []).includes(d));
    return `<div class="page codex">${stamp}
      <div class="kicker">KODEX · ${escapeHtml(e.group.toUpperCase())}</div>
      <h3>${escapeHtml(e.title)}</h3>
      <svg class="dial" viewBox="0 0 60 36"><path d="M6 32a24 24 0 0 1 48 0" fill="none" stroke="#7a1a10" stroke-width="1.6"/><path d="M2 32h56" stroke="#7a1a10" stroke-width="1.6"/><line x1="30" y1="32" x2="${30 + Math.cos(-2.2) * 20}" y2="${32 + Math.sin(-2.2) * 20}" stroke="#7a1a10" stroke-width="1.6" stroke-linecap="round"/></svg>
      <p class="txt drop">${escapeHtml(e.text)}</p>
      ${src ? `<p class="margin">Aus: ${escapeHtml(DOCS[src[0]].title)}</p>` : ''}
    </div>`;
  };
  return { items, view, counts };
}

// ============================================================================ III · Dokumente

function docsTab(game) {
  const st = game.state;
  const found = new Set((st.docs || []).filter(id => DOCS[id]));
  const items = [], counts = {};
  for (const g of GROUP_ORDER) {
    const all = groupDocs(g);
    const have = all.filter(id => found.has(id));
    if (!have.length) continue;
    const info = groupInfo(g);
    counts[info.title.toUpperCase()] = `${have.length}/${all.length}`;
    for (const id of have) {
      const d = DOCS[id];
      items.push({ key: id, label: d.title, group: info.title.toUpperCase(), seenKey: 'd:' + id, isNew: true, mark: d.style === 'tape' ? '◉' : d.style === 'terminal' ? '▤' : d.style === 'chalk' ? '✎' : '▭' });
    }
  }
  const total = Object.keys(DOCS).length;
  const view = (id) => {
    const d = DOCS[id];
    if (!d) return '';
    const g = docGroup(id), info = groupInfo(g);
    const cls = PAPER[d.style] ?? '';
    return `<div class="docwrap"><div class="chainline">${escapeHtml(info.title)} · ${escapeHtml(info.sub || '')}</div>
      <div class="paper ${cls}">${d.style === 'tape' ? '<div class="walze"></div>' : ''}<h3>${escapeHtml(d.title)}</h3><div class="meta">${escapeHtml(d.meta || '')}</div><div class="body">${escapeHtml(docText(d, st))}</div></div></div>`;
  };
  const empty = `<div class="page empty"><div class="kicker">DOKUMENTE · 0/${total}</div><h3>Noch nichts gefunden</h3>
    <p class="txt">Unten liegen Zettel, Briefe, Tonwalzen, Inschriften – was die Tiefe vergessen hat oder behalten will. Sie schimmern, wenn die Lampe sie trifft.</p>
    <p class="margin">Lesen mit E. Alles Gelesene landet hier.</p></div>`;
  return { items, view, counts, empty };
}

// ============================================================================ IV · Strichliste

function tallyTab(game) {
  const st = game.state;
  const s = st.stats || {};
  const nights = s.nights || 0;
  const log = st.contractLog || [];
  const ok = log.filter(e => e.ok).length, no = log.filter(e => !e.ok && !e.skipped).length;
  const codexAll = Object.keys(CODEX).length, codexHave = Object.keys(CODEX).filter(id => codexOpen(st, id)).length;
  const name = nameWithLetters(st.name, st.letters || 0);
  const rows = [
    ['Nächte unten', nights],
    ['Zehntwochen überstanden', Math.max(0, st.week - 1)],
    ['Tode', s.deaths || 0],
    ['Verkauft insgesamt', `${s.total || 0} M`],
    ['Beste Nacht', `${s.bestNight || 0} M`],
    ['Unten verloren', `${s.lost || 0} M`],
    ['Aufträge', `${ok} erfüllt · ${no} verfehlt`],
    ['Dokumente', `${(st.docs || []).filter(id => DOCS[id]).length} / ${Object.keys(DOCS).length}`],
    ['Kodex', `${codexHave} / ${codexAll}`],
    ['Marken', st.marks],
  ];
  if (st.letters) rows.push(['Buchstaben abgegeben', st.letters]);
  const quota = [];
  for (let w = 1; w <= st.week; w++) {
    const q = w < st.week ? quotaFor(w, st.difficulty) : st.quota;
    const v = w < st.week ? q : st.sold;
    const pct = Math.min(100, Math.round(v / Math.max(1, q) * 100));
    quota.push(`<div class="q ${w < st.week ? 'done' : ''}"><span>WOCHE ${w}</span><div class="bar"><i style="width:${pct}%"></i></div><b>${w < st.week ? '✓ ' + q : `${st.sold}/${q}`} M</b></div>`);
  }
  const view = () => `<div class="sheet">
    <div class="tallypage">
      <div class="crew">Mannschaft ${st.crew || 47}</div>
      <div class="tally">${tallySvg(nights, st.name || 'x')}</div>
      <div class="sum">${nights ? `${nights} ${nights === 1 ? 'Nacht' : 'Nächte'} · Woche ${st.week}, Nacht ${Math.min(3, st.night + 1)}` : 'Noch keine Nacht. Die erste Kerbe wartet.'}</div>
      <div class="sig">gez. ${escapeHtml(name)}</div>
    </div>
    <div class="ledger">
      <h4>BILANZ</h4>${rows.map(([a, b]) => `<div class="row2"><span>${escapeHtml(a)}</span><b>${escapeHtml(String(b))}</b></div>`).join('')}
      <h4>QUOTE</h4>${quota.join('')}
    </div></div>`;
  return { single: true, items: [], view };
}

// Strichliste: Fünferbündel in Bleistift. Darunter, kaum sichtbar, radierte Striche von früher.
function tallySvg(n, seedStr) {
  let seed = 7;
  for (const ch of seedStr) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = (i, k) => { const x = Math.sin((i + 1) * 12.9898 + k * 78.233 + seed * 0.001) * 43758.5453; return x - Math.floor(x); };
  const perRow = 6, bw = 72, rowH = 78, x0 = 14, y0 = 12, h = 54;
  const stroke = (x1, y1, x2, y2, i, k, w, op) => {
    const mx = (x1 + x2) / 2 + (rnd(i, k) - 0.5) * 5, my = (y1 + y2) / 2 + (rnd(i, k + 1) - 0.5) * 4;
    return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke-width="${w.toFixed(2)}" opacity="${op.toFixed(2)}"/>`;
  };
  const draw = (count, k, w, op, dx = 0, dy = 0) => {
    let out = '';
    for (let i = 0; i < count; i++) {
      const b = Math.floor(i / 5), j = i % 5, row = Math.floor(b / perRow), col = b % perRow;
      const bx = x0 + col * bw + dx, by = y0 + row * rowH + dy;
      if (j < 4) {
        const x = bx + j * 12 + (rnd(i, k) - 0.5) * 3;
        out += stroke(x + (rnd(i, k + 2) - 0.5) * 3, by + rnd(i, k + 3) * 5, x + (rnd(i, k + 4) - 0.5) * 4, by + h - rnd(i, k + 5) * 5, i, k, w * (0.85 + rnd(i, k + 6) * 0.3), op);
      } else {
        out += stroke(bx - 7, by + h - 10 - rnd(i, k) * 6, bx + 43, by + 8 + rnd(i, k + 1) * 6, i, k, w * 1.05, op);
      }
    }
    return out;
  };
  const rows = Math.max(2, Math.ceil(Math.max(n, 46) / 5 / perRow));
  const H = y0 + rows * rowH;
  // 46 radierte Striche (Vorgänger) – nur als Schatten im Papier
  const ghost = draw(46, 50, 4.2, 0.06, 3, 2);
  const real = draw(n, 1, 2.8, 0.88);
  return `<svg viewBox="0 0 ${x0 * 2 + perRow * bw} ${H}" preserveAspectRatio="xMinYMin meet"><g fill="none" stroke="#2b2320" stroke-linecap="round">${ghost}${real}</g></svg>`;
}
