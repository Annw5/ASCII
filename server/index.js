import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { PORT, TICK_MS, CHUNK, SEA, POOL, NPC, OFFERS, doTrade } from '../shared/world.js';
import { newChunk, newId, occupied, canStep, mobAt, interact, mobView, tickChunk, clock } from '../shared/mob.js';

// ---------- мир ----------
const N = 0, E = 1, S = 2, W = 3;
const chunks = new Map();                    // чанки на сервере не выгружаются
const players = new Map();                   // id -> игрок {id, name, ws, inv, trade, chunk, x, y}

function getChunk(id) {
  if (!chunks.has(id)) chunks.set(id, newChunk(id));
  return chunks.get(id);
}

function neighbor(from, dir) {               // связи общие для всех игроков
  if (from.links[dir] !== -1) return getChunk(from.links[dir]);
  const opp = (dir + 2) % 4;
  for (let t = 0; t < 50; t++) {
    const id = Math.floor(Math.random() * POOL);
    if (id === from.id) continue;
    const to = getChunk(id);
    if (to.links[opp] !== -1) continue;
    from.links[dir] = to.id;
    to.links[opp] = from.id;
    return to;
  }
  return null;
}

function spawnPlayer(p) {
  const c = getChunk(Math.floor(Math.random() * POOL));
  const mid = CHUNK / 2;
  let best = Infinity;
  for (let y = 0; y < CHUNK; y++) {
    for (let x = 0; x < CHUNK; x++) {
      if (c.heights[y * CHUNK + x] <= SEA || occupied(c, x, y)) continue;
      const d = Math.abs(x - mid) + Math.abs(y - mid);
      if (d < best) { best = d; p.x = x; p.y = y; }
    }
  }
  p.chunk = c;
  c.players.add(p);
  players.set(p.id, p);
}

function leave(p) {
  p.chunk.players.delete(p);
  players.delete(p.id);
}

function movePlayer(p, dx, dy) {             // false — не пошёл, true — шаг, 'chunk' / 'hit' / 'item'
  const c = p.chunk;
  let nx = p.x + dx, ny = p.y + dy, dirX = -1, dirY = -1;
  if (nx < 0)           { dirX = W; nx = CHUNK - 1; }
  else if (nx >= CHUNK) { dirX = E; nx = 0; }
  if (ny < 0)           { dirY = N; ny = CHUNK - 1; }
  else if (ny >= CHUNK) { dirY = S; ny = 0; }
  if (dirX !== -1 && dirY !== -1) return false;

  if (dirX !== -1 || dirY !== -1) {
    const to = neighbor(c, dirX !== -1 ? dirX : dirY);
    if (!to || occupied(to, nx, ny)) return false;
    c.players.delete(p);
    to.players.add(p);
    p.chunk = to; p.x = nx; p.y = ny;
    return 'chunk';
  }
  const target = mobAt(c, nx, ny);
  if (target) {
    if (interact(c, target, p, clock.tick) === 'trade') p.trade = true;   // клиент откроет окно торговли
    return 'hit';
  }
  const o = c.objs[ny * CHUNK + nx];
  if (o) { p.inv[o] = (p.inv[o] || 0) + 1; return 'item'; }
  if (!canStep(c, p.x, p.y, nx, ny)) return false;
  p.x = nx; p.y = ny;
  return true;
}

const nearNpc = (p) => p.chunk.mobs.some((m) => m.kind === NPC && Math.max(Math.abs(m.x - p.x), Math.abs(m.y - p.y)) <= 2);

// ---------- сообщения ----------
const send = (p, msg) => { if (p.ws.readyState === 1) p.ws.send(JSON.stringify(msg)); };
const sendChunk = (p) => send(p, { t: 'chunk', id: p.chunk.id, heights: [...p.chunk.heights], objs: [...p.chunk.objs] });
const sendState = (p) => {
  send(p, {
    t: 'state', you: { x: p.x, y: p.y }, inv: p.inv, trade: p.trade,
    mobs: p.chunk.mobs.map((m) => mobView(m, p.id)),
  });
  p.trade = false;                           // окно открывается один раз, закрывает его сам игрок
};

// ---------- http ----------
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const ALLOWED = /^(index\.html|sw\.js|(client-web|client-core|shared)\/)/;

const http = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path === '/') path = '/index.html';
    const file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT) || !ALLOWED.test(file.slice(ROOT.length).replace(/\\/g, '/'))) throw new Error('denied');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404).end('not found');
  }
});

// ---------- websocket ----------
new WebSocketServer({ server: http }).on('connection', (ws) => {
  let p = null;
  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }
    if (msg.t === 'hello' && !p) {
      p = { id: newId(), name: String(msg.name || 'Путник').slice(0, 16), ws, inv: {}, trade: false };
      spawnPlayer(p);
      sendChunk(p);
      sendState(p);
    } else if (msg.t === 'move' && p) {
      const { dx, dy } = msg;
      if (![dx, dy].every((v) => v === -1 || v === 0 || v === 1)) return;   // только шаг на 1 клетку
      if (movePlayer(p, dx, dy) === 'chunk') sendChunk(p);
      sendState(p);
    } else if (msg.t === 'trade' && p) {
      if (Number.isInteger(msg.i) && msg.i >= 0 && msg.i < OFFERS.length && nearNpc(p)) doTrade(p.inv, msg.i);
      sendState(p);
    }
  });
  ws.on('close', () => { if (p) leave(p); });
  ws.on('error', () => {});
});

// ---------- ходы мира ----------
setInterval(() => {
  clock.tick++;
  const active = new Set([...players.values()].map((p) => p.chunk));   // ходят чанки с игроками
  for (const c of active) tickChunk(c, clock.tick);
  for (const p of players.values()) sendState(p);
}, TICK_MS);

const port = process.env.PORT || PORT;
http.listen(port, () => console.log(`порт ${port}`));
