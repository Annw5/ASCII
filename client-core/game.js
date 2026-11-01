import { CHUNK, SEA, MAXH, POOL, MOB_KINDS } from '../shared/world.js';
import { newChunk, tickChunk, clock, mobAt, interact } from '../shared/mob.js';
import { drawIso, drawMobList, ui } from './view.js';

// ---------- пул чанков (одиночная игра) ----------
const N = 0, E = 1, S = 2, W = 3;
const loaded = new Map();
export const world = { cur: null };

function load(id) {
  if (!loaded.has(id)) loaded.set(id, newChunk(id));
  return loaded.get(id);
}

function pick(from, dir) {                   // случайный сосед для стороны dir
  const opp = (dir + 2) % 4;
  for (let t = 0; t < 50; t++) {
    const id = Math.floor(Math.random() * POOL);
    if (id === from.id) continue;
    const c = loaded.get(id);
    if (c && c.links[opp] !== -1) continue;
    return id;
  }
  return (from.id + 1) % POOL;
}

function go(dir) {
  const from = world.cur;
  let to = from.links[dir];
  if (to === -1) { to = pick(from, dir); from.links[dir] = to; }
  const next = load(to);
  next.links[(dir + 2) % 4] = from.id;
  world.cur = next;
  for (const id of [...loaded.keys()]) if (id !== next.id && id !== from.id) loaded.delete(id);
  for (const c of loaded.values())
    for (let i = 0; i < 4; i++) if (!loaded.has(c.links[i])) c.links[i] = -1;
}

// ---------- одиночная игра ----------
export const player = { id: 0, name: 'Путник', x: 0, y: 0 };
export const inventory = {};

const at = (x, y) => world.cur.heights[y * CHUNK + x];

function blocked(x, y) {
  const c = world.cur;
  return c.objs[y * CHUNK + x] !== 0 || c.mobs.some((m) => m.x === x && m.y === y);
}

export function viewSize() {
  return { cols: CHUNK * 2 + 4, rows: ((MAXH + 1) >> 1) + CHUNK + 6 };
}

function placeNearCenter() {
  const mid = CHUNK / 2;
  let best = Infinity;
  for (let y = 0; y < CHUNK; y++) {
    for (let x = 0; x < CHUNK; x++) {
      if (at(x, y) <= SEA || blocked(x, y)) continue;
      const d = Math.abs(x - mid) + Math.abs(y - mid);
      if (d < best) { best = d; player.x = x; player.y = y; }
    }
  }
}

function spawn() {
  world.cur = load(Math.floor(Math.random() * POOL));
  placeNearCenter();
}

export const snapshot = () => ({ chunk: world.cur.id, x: player.x, y: player.y, inv: inventory });

export function resume(s) {
  if (!s) return spawn();
  loaded.clear();
  world.cur = load(s.chunk);
  player.x = s.x; player.y = s.y;
  for (const k of Object.keys(inventory)) delete inventory[k];
  Object.assign(inventory, s.inv);
  if (at(s.x, s.y) <= SEA) placeNearCenter();
}

export function tickGame() {                 // один ход мира
  const c = world.cur;
  c.players.clear();
  c.players.add(player);
  tickChunk(c, ++clock.tick);
}

export function tryMove(dx, dy) {
  let nx = player.x + dx, ny = player.y + dy, dirX = -1, dirY = -1;
  if (nx < 0)           { dirX = W; nx = CHUNK - 1; }
  else if (nx >= CHUNK) { dirX = E; nx = 0; }
  if (ny < 0)           { dirY = N; ny = CHUNK - 1; }
  else if (ny >= CHUNK) { dirY = S; ny = 0; }
  if (dirX !== -1 && dirY !== -1) return;    // угол чанка не пускаем

  if (dirX !== -1 || dirY !== -1) {
    go(dirX !== -1 ? dirX : dirY);
    player.x = nx; player.y = ny;
    return;
  }
  const target = mobAt(world.cur, nx, ny);
  if (target) { interact(world.cur, target, player, clock.tick); return; }
  const next = at(nx, ny);
  if (next > SEA && Math.abs(next - at(player.x, player.y)) <= 1 && !blocked(nx, ny)) {
    player.x = nx; player.y = ny;
  }
}

export function renderGame(screen) {
  screen.clear(0x000000);
  if (ui.list) { drawMobList(screen, world.cur.mobs); return; }
  drawIso(screen, world.cur.heights, player, world.cur.objs, world.cur.mobs);
  screen.text(1, 0, ` chunk:${world.cur.id} x:${player.x} y:${player.y} h:${at(player.x, player.y)}  I — список `, 0x888888);
  const talker = world.cur.mobs.find((m) => m.say && m.sayTo === player.id);
  if (talker) screen.text(1, screen.h - 1, ` ${MOB_KINDS[talker.kind].name}: ${talker.say} `, 0x4de1ff);
}

// ---------- сохранение ----------
export function encode({ chunk, x, y, inv }) {
  const items = Object.entries(inv).filter(([, n]) => n > 0).map(([id, n]) => `${id}:${n}`).join(',');
  return `${chunk},${x},${y};${items}`;
}

export function decode(str) {
  if (!str) return null;
  const [pos, items = ''] = str.split(';');
  const [chunk, x, y] = pos.split(',').map(Number);
  if (![chunk, x, y].every(Number.isInteger)) return null;
  if (chunk < 0 || chunk >= POOL || x < 0 || y < 0 || x >= CHUNK || y >= CHUNK) return null;
  const inv = {};
  for (const p of items.split(',')) {
    if (!p) continue;
    const [id, n] = p.split(':').map(Number);
    if (Number.isInteger(id) && Number.isInteger(n) && n > 0) inv[id] = n;
  }
  return { chunk, x, y, inv };
}

// ---------- онлайн ----------
const net = { x: 0, y: 0 };
const st = { id: -1, heights: null, objs: null, mobs: [], ready: false };

export function onMessage(msg) {
  if (msg.t === 'chunk') {
    st.id = msg.id;
    st.heights = Uint8Array.from(msg.heights);
    st.objs = Uint8Array.from(msg.objs);
    st.mobs = [];
    st.ready = false;
  } else if (msg.t === 'state') {
    net.x = msg.you.x; net.y = msg.you.y;
    st.mobs = msg.mobs;
    st.ready = !!st.heights;
  }
}

export function renderOnline(screen) {
  screen.clear(0x000000);
  if (!st.ready) { screen.text(1, 1, 'подключение...', 0x888888); return; }
  if (ui.list) { drawMobList(screen, st.mobs); return; }
  drawIso(screen, st.heights, net, st.objs, st.mobs);
  screen.text(1, 0, ` chunk:${st.id} x:${net.x} y:${net.y} h:${st.heights[net.y * CHUNK + net.x]}  I — список `, 0x888888);
  const talker = st.mobs.find((m) => m.say);
  if (talker) screen.text(1, screen.h - 1, ` ${MOB_KINDS[talker.kind].name}: ${talker.say} `, 0x4de1ff);
}
