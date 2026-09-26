// Oberfläche: Bildschirme, HUD, Kom, Hinweise, Karten, Dokumente, Tagebuch.

import { settings } from '../core/settings.js';
import { voice, escapeHtml } from '../audio/voice.js';
import { audio } from '../audio/audio.js';

const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, cls = '', html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };

class UI {
  init() {
    this.root = document.getElementById('ui');
    this.root.innerHTML = `
      <div id="hud" class="screen">
        <div id="crosshair"></div>
        <div id="prompt"></div>
        <div id="noise"><i></i><i></i><i></i><i></i><i></i></div>
        <div id="stamina"><i></i></div>
        <div id="objective"><div class="lbl">AUFGABE</div><div class="txt"></div></div>
        <div id="floorcard"><div class="num"></div><div class="nm"></div></div>
        <div id="hints"></div>
        <div id="toasts"></div>
        <div id="hideslits"></div>
        <div id="echo-label">ECHO · WARTE AUF DIE ABFAHRT</div>
        <div id="kom">
          <div class="hdr"><span>KOM · BR. v. SEIL</span><span class="clock">03:07</span></div>
          <div class="name"></div>
          <div class="obj"></div>
          <div class="bars">
            <span>LAMPE</span><div class="bar" id="bar-bat"><i></i></div>
          </div>
          <div class="res"></div>
          <div class="msg"></div>
        </div>
        <div id="chat"></div>
        <div id="chatin" class="interactive"><input class="text-in" maxlength="120" placeholder="Nachricht … (Enter)"></div>
      </div>
      <div id="subs"></div>
      <div id="chapter" class="screen"><div class="act"></div><div class="name"></div><div class="motto"></div></div>
      <div id="doc" class="screen interactive"><div class="paper"><h3></h3><div class="meta"></div><div class="body"></div></div><div class="close">[E] / [ESC] SCHLIESSEN</div></div>
      <div id="loading" class="screen"><div class="q"><p></p><cite></cite></div>
        <div class="dial"><svg viewBox="0 0 60 40"><path d="M6 34a24 24 0 0 1 48 0" fill="none" stroke="#c9a050" stroke-width="2"/><path d="M2 34h56" stroke="#c9a050" stroke-width="2"/><line class="needle" x1="30" y1="34" x2="30" y2="12" stroke="#ff5530" stroke-width="2" stroke-linecap="round"/></svg></div></div>
      <div id="intro" class="screen"><div class="txt"></div><div class="skip">[LEERTASTE] ÜBERSPRINGEN</div></div>
      <div id="menus"></div>
      <div id="fadeblack" style="position:absolute;inset:0;background:#000;opacity:0;transition:opacity 0.8s;pointer-events:none"></div>
    `;
    voice.attach($('#subs'));
    this.hud = {
      root: $('#hud'), prompt: $('#prompt'), cross: $('#crosshair'), noise: $('#noise'), stamina: $('#stamina'),
      kom: $('#kom'), komName: $('#kom .name'), komObj: $('#kom .obj'), komMsg: $('#kom .msg'), komRes: $('#kom .res'), komClock: $('#kom .clock'),
      bat: $('#bar-bat'), hints: $('#hints'), toasts: $('#toasts'), objective: $('#objective'), floorcard: $('#floorcard'),
      slits: $('#hideslits'), echo: $('#echo-label'), chat: $('#chat'), chatin: $('#chatin'),
    };
    this.hintMap = new Map();
    this.komQueue = [];
  }

  // ---------------------------------------------------------------- Screens
  show(id, on = true) { const e = document.getElementById(id); if (e) e.classList.toggle('active', on); }
  hide(id) { this.show(id, false); }
  fade(to = 1, ms = 800) {
    const f = $('#fadeblack');
    f.style.transition = `opacity ${ms}ms`;
    f.style.opacity = to;
    return new Promise(r => setTimeout(r, ms));
  }

  // ---------------------------------------------------------------- HUD
  setHud(on) { this.show('hud', on); }

  setPrompt(text, key = 'E', sub = '') {
    const p = this.hud.prompt;
    if (!text) { p.classList.remove('show'); this.hud.cross.classList.remove('hot'); this._prompt = null; return; }
    const k = `${key}|${text}|${sub}`;
    if (this._prompt !== k) {
      p.innerHTML = `${key ? `<span class="key">${key}</span>` : ''}${escapeHtml(text)}${sub ? `<span class="sub">${escapeHtml(sub)}</span>` : ''}`;
      this._prompt = k;
    }
    p.classList.add('show');
    this.hud.cross.classList.add('hot');
  }

  setNoise(level) {
    const n = this.hud.noise;
    n.classList.toggle('show', level > 0.5);
    const bars = n.children;
    const k = Math.min(1, level / 12);
    for (let i = 0; i < bars.length; i++) {
      const h = Math.max(2, Math.sin((i + 1) / bars.length * Math.PI) * 22 * k * (0.7 + Math.random() * 0.3));
      bars[i].style.height = h + 'px';
      bars[i].style.background = k > 0.7 ? 'rgba(255,90,60,0.9)' : 'rgba(233,220,194,0.8)';
    }
  }

  setStamina(v, show) {
    this.hud.stamina.classList.toggle('show', show);
    this.hud.stamina.firstChild.style.width = (v * 100) + '%';
  }

  setKom({ name, battery, res, clock }) {
    if (name !== undefined && name !== this._komName) { this.hud.komName.innerHTML = name; this._komName = name; }
    if (battery !== undefined) {
      this.hud.bat.firstChild.style.width = (battery * 100) + '%';
      this.hud.bat.classList.toggle('low', battery < 0.2);
    }
    if (res !== undefined && res !== this._komRes) { this.hud.komRes.innerHTML = res; this._komRes = res; }
    if (clock !== undefined) this.hud.komClock.textContent = clock;
  }

  setObjective(text, banner = true) {
    this.hud.komObj.textContent = text ? '▸ ' + text : '';
    if (banner && text) {
      const o = this.hud.objective;
      o.querySelector('.txt').textContent = text;
      o.classList.remove('show'); void o.offsetWidth; o.classList.add('show');
    }
  }

  komMessage(text, { glitch = false, beep = true } = {}) {
    this.hud.komMsg.textContent = text;
    if (beep) audio.play('komBeep', { n: 2 });
    const k = this.hud.kom;
    if (glitch) { k.classList.remove('glitch'); void k.offsetWidth; k.classList.add('glitch'); }
    clearTimeout(this._komT);
    this._komT = setTimeout(() => { this.hud.komMsg.textContent = ''; }, 14000);
  }

  showKom(on) { this.hud.kom.classList.toggle('hidden', !on); }

  hint(id, key, text, ttl = 0) {
    if (this.hintMap.has(id)) return;
    const h = el('div', 'hint', `${key ? `<span class="key">${key}</span>` : ''}<span>${text}</span>`);
    this.hud.hints.appendChild(h);
    this.hintMap.set(id, h);
    if (ttl) setTimeout(() => this.hintDone(id), ttl * 1000);
  }
  hintDone(id) {
    const h = this.hintMap.get(id);
    if (!h || h.classList.contains('done')) return;
    h.classList.add('done');
    setTimeout(() => h.remove(), 700);
  }
  clearHints() { for (const id of [...this.hintMap.keys()]) this.hintDone(id); this.hintMap.clear(); }

  toast(text) {
    const t = el('div', 'toast', escapeHtml(text));
    this.hud.toasts.appendChild(t);
    setTimeout(() => t.remove(), 2700);
  }

  floorCard(num, name) {
    const f = this.hud.floorcard;
    f.querySelector('.num').textContent = num;
    f.querySelector('.nm').textContent = name;
    f.classList.remove('show'); void f.offsetWidth; f.classList.add('show');
  }

  chapter(act, name, motto) {
    const c = $('#chapter');
    c.querySelector('.act').textContent = act;
    c.querySelector('.name').textContent = name;
    c.querySelector('.motto').textContent = motto;
    c.classList.remove('active'); void c.offsetWidth; c.classList.add('active');
    audio.play('stinger', { kind: 'reveal', vol: 0.7 });
    return new Promise(r => setTimeout(() => { c.classList.remove('active'); r(); }, 6200));
  }

  setHidden(on) { this.hud.slits.classList.toggle('show', on); }
  setEcho(on) { this.hud.echo.classList.toggle('show', on); }

  chatLine(name, text) {
    const l = el('div', 'ln', `<b>${escapeHtml(name)}:</b> ${escapeHtml(text)}`);
    this.hud.chat.appendChild(l);
    while (this.hud.chat.children.length > 6) this.hud.chat.firstChild.remove();
    setTimeout(() => l.remove(), 9500);
  }

  // ---------------------------------------------------------------- Laden
  loading(quote) {
    const l = $('#loading');
    l.querySelector('p').textContent = `„${quote[0]}“`;
    l.querySelector('cite').textContent = '— ' + quote[1];
    this.show('loading');
  }
  loadingDone() { this.hide('loading'); }

  // ---------------------------------------------------------------- Intro (Schreibmaschine)
  intro(pages) {
    return new Promise((resolve) => {
      const scr = $('#intro'), txt = scr.querySelector('.txt');
      this.show('intro');
      let skip = false, i = 0;
      const onKey = (e) => { if (e.code === 'Space' || e.code === 'Escape') skip = true; };
      window.addEventListener('keydown', onKey);
      const next = async () => {
        if (skip || i >= pages.length) { window.removeEventListener('keydown', onKey); await this.fade(1, 600); this.hide('intro'); resolve(); return; }
        const page = pages[i++];
        txt.innerHTML = '';
        for (let c = 0; c <= page.length; c++) {
          if (skip) break;
          txt.innerHTML = escapeHtml(page.slice(0, c)).replace(/\n/g, '<br>') + '<span class="cur"></span>';
          if (c % 2 === 0 && page[c] && page[c] !== ' ') audio.play('crankTick', { vol: 0.05 });
          await new Promise(r => setTimeout(r, page[c - 1] === '\n' ? 260 : page[c - 1] === '.' ? 180 : 34));
        }
        await new Promise(r => setTimeout(r, 2200));
        next();
      };
      next();
    });
  }

  // ---------------------------------------------------------------- Dokument
  doc(d, text) {
    return new Promise((resolve) => {
      const scr = $('#doc'), paper = scr.querySelector('.paper');
      paper.className = 'paper ' + ({ hand: 'hand', church: 'church', terminal: 'terminal', chalk: 'chalk', tape: 'tape', child: 'hand' }[d.style] || '');
      paper.querySelector('h3').textContent = d.title;
      paper.querySelector('.meta').textContent = d.meta || '';
      paper.querySelector('.body').textContent = text;
      paper.scrollTop = 0;
      this.show('doc');
      audio.play('paper');
      const close = (e) => {
        if (e && e.type === 'keydown' && !['KeyE', 'Escape', 'Tab', 'Space'].includes(e.code)) return;
        if (e) e.preventDefault();
        window.removeEventListener('keydown', close, true);
        scr.removeEventListener('click', close);
        this.hide('doc');
        resolve();
      };
      setTimeout(() => { window.addEventListener('keydown', close, true); scr.addEventListener('click', close); }, 250);
    });
  }

  // Hilfsfunktionen für Menüs
  menus() { return $('#menus'); }
  el(tag, cls, html) { return el(tag, cls, html); }
}

export const ui = new UI();
