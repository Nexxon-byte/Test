// TIEFER – Webserver + Koop-Lobby (WebSocket-Relay)
// Start: `npm start` oder START.bat  →  http://localhost:3033

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3033;
const VERSION = '1.0.0';
const MAX_PLAYERS = 4;

// ---------------------------------------------------------------- static files

const MOUNTS = [
  ['/vendor/three/', path.join(ROOT, 'node_modules/three/')],
  ['/fonts/special-elite/', path.join(ROOT, 'node_modules/@fontsource/special-elite/files/')],
  ['/fonts/vt323/', path.join(ROOT, 'node_modules/@fontsource/vt323/files/')],
  ['/fonts/cormorant-garamond/', path.join(ROOT, 'node_modules/@fontsource/cormorant-garamond/files/')],
  ['/fonts/caveat/', path.join(ROOT, 'node_modules/@fontsource/caveat/files/')],
  ['/', path.join(ROOT, 'public/')],
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function resolveStatic(urlPath) {
  for (const [prefix, dir] of MOUNTS) {
    if (!urlPath.startsWith(prefix)) continue;
    const rel = decodeURIComponent(urlPath.slice(prefix.length)) || 'index.html';
    const full = path.normalize(path.join(dir, rel));
    if (!full.startsWith(dir)) return null; // path traversal
    return full;
  }
  return null;
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  const file = resolveStatic(urlPath);
  if (!file) { res.writeHead(403); res.end('Verboten'); return; }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); res.end('Nicht gefunden – tiefer gibt es nichts.'); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': urlPath.startsWith('/vendor/') || urlPath.startsWith('/fonts/') ? 'max-age=86400' : 'no-cache',
    });
    fs.createReadStream(file).pipe(res);
  });
});

// ---------------------------------------------------------------- lobby / relay

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 256 * 1024 });
const rooms = new Map();      // code -> room
let nextId = 1;

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCode() {
  for (let tries = 0; tries < 1000; tries++) {
    let c = '';
    for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    if (!rooms.has(c)) return c;
  }
  throw new Error('Keine Raumcodes mehr frei');
}

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function roomState(room) {
  return {
    t: 'room',
    code: room.code,
    hostId: room.hostId,
    started: room.started,
    players: [...room.clients.values()].map(c => ({ id: c.id, name: c.name, ready: c.ready })),
  };
}

function broadcastRoom(room, msg, exceptId = null) {
  for (const c of room.clients.values()) if (c.id !== exceptId) send(c.ws, msg);
}

function leaveRoom(client) {
  const room = client.room;
  if (!room) return;
  room.clients.delete(client.id);
  client.room = null;
  if (room.clients.size === 0) { rooms.delete(room.code); return; }
  if (room.hostId === client.id) {
    // Der Host hält die Welt – ohne ihn zerfällt sie.
    broadcastRoom(room, { t: 'hostLeft' });
    for (const c of room.clients.values()) c.room = null;
    rooms.delete(room.code);
    return;
  }
  broadcastRoom(room, { t: 'playerLeft', id: client.id });
  broadcastRoom(room, roomState(room));
}

function cleanName(n) {
  const s = String(n || '').replace(/[^\p{L}\p{N} ._\-']/gu, '').trim().slice(0, 16);
  return s || 'Namenlos';
}

wss.on('connection', (ws) => {
  const client = { id: nextId++, ws, name: 'Namenlos', ready: false, room: null, alive: true };
  send(ws, { t: 'welcome', id: client.id, version: VERSION });

  ws.on('pong', () => { client.alive = true; });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || typeof msg.t !== 'string') return;

    switch (msg.t) {
      case 'hello':
        client.name = cleanName(msg.name);
        break;

      case 'create': {
        leaveRoom(client);
        const room = { code: makeCode(), hostId: client.id, clients: new Map(), started: false, seed: 0 };
        rooms.set(room.code, room);
        room.clients.set(client.id, client);
        client.room = room;
        client.ready = false;
        send(ws, roomState(room));
        break;
      }

      case 'join': {
        const code = String(msg.code || '').toUpperCase().trim();
        const room = rooms.get(code);
        if (!room) { send(ws, { t: 'error', msg: 'Kein Raum mit diesem Code. Die Tür bleibt zu.' }); break; }
        if (room.started) { send(ws, { t: 'error', msg: 'Die Kabine ist bereits abgefahren.' }); break; }
        if (room.clients.size >= MAX_PLAYERS) { send(ws, { t: 'error', msg: 'Die Kabine ist voll (max. 4).' }); break; }
        leaveRoom(client);
        room.clients.set(client.id, client);
        client.room = room;
        client.ready = false;
        broadcastRoom(room, roomState(room));
        break;
      }

      case 'leave':
        leaveRoom(client);
        break;

      case 'ready':
        if (client.room) { client.ready = !!msg.ready; broadcastRoom(client.room, roomState(client.room)); }
        break;

      case 'name':
        client.name = cleanName(msg.name);
        if (client.room) broadcastRoom(client.room, roomState(client.room));
        break;

      case 'start': {
        const room = client.room;
        if (!room || room.hostId !== client.id || room.started) break;
        room.started = true;
        room.seed = (Math.random() * 2 ** 31) >>> 0;
        const players = [...room.clients.values()].map(c => ({ id: c.id, name: c.name }));
        broadcastRoom(room, { t: 'start', seed: room.seed, players, hostId: room.hostId });
        break;
      }

      case 'relay': {
        const room = client.room;
        if (!room) break;
        const out = JSON.stringify({ t: 'relay', from: client.id, d: msg.d });
        if (msg.to) {
          const target = room.clients.get(msg.to);
          if (target && target.ws.readyState === 1) target.ws.send(out);
        } else {
          for (const c of room.clients.values()) {
            if (c.id !== client.id && c.ws.readyState === 1) c.ws.send(out);
          }
        }
        break;
      }
    }
  });

  ws.on('close', () => leaveRoom(client));
  ws.on('error', () => leaveRoom(client));
  ws._client = client;
});

// tote Verbindungen aufräumen
setInterval(() => {
  for (const ws of wss.clients) {
    const c = ws._client;
    if (!c) continue;
    if (!c.alive) { ws.terminate(); continue; }
    c.alive = false;
    try { ws.ping(); } catch { /* egal */ }
  }
}, 15000);

// ---------------------------------------------------------------- start

server.listen(PORT, () => {
  const lan = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) if (i.family === 'IPv4' && !i.internal) lan.push(i.address);
  }
  console.log('');
  console.log('  ████████ ██ ███████ ███████ ███████ ██████  ');
  console.log('     ██    ██ ██      ██      ██      ██   ██ ');
  console.log('     ██    ██ █████   █████   █████   ██████  ');
  console.log('     ██    ██ ██      ██      ██      ██   ██ ');
  console.log('     ██    ██ ███████ ██      ███████ ██   ██ ');
  console.log('');
  console.log(`  Kabine 9 ist bereit.   http://localhost:${PORT}`);
  for (const ip of lan) console.log(`  Im Heimnetz (Koop):    http://${ip}:${PORT}`);
  console.log('');
  console.log('  Fenster offen lassen, solange gespielt wird. Strg+C beendet den Server.');
  console.log('');
});
