import { CHUNK, makeChunk } from '../shared/chunk.js';
import { SEA } from '../shared/terrain.js';
import { makeObjects, } from '../shared/objects.js';

import { makeMob, occupied, canStep, newId, clock, mobAt, hit } from '../shared/mob.js';
export { makeMob, occupied, canStep, newId, clock };     // остальные файлы импортируют их отсюда

export const POOL = 100;
export const N = 0, E = 1, S = 2, W = 3;

const chunks = new Map();                    // на сервере чанки не выгружаются: их всего 100
export const players = new Map();            // id -> игрок {id, name, ws, chunk, x, y}

let nextId = 1;

export function getChunk(id) {
  let c = chunks.get(id);
  if (c) return c;
  const heights = makeChunk(id * 37, id * 61);
  const objs = makeObjects(id, heights);
  c = {
    id, heights, objs,
    links: [-1, -1, -1, -1],
    mobs: makeMobs(id, heights, objs).map((m) => makeMob(m.x, m.y, m.kind)),
    players: new Set(),
    respawn: [],                             // очередь «возрождения» съеденных зверей
  };
  chunks.set(id, c);
  return c;
}

export function neighbor(from, dir) {        // сосед по стороне dir; связи общие для всех игроков
  if (from.links[dir] !== -1) return getChunk(from.links[dir]);
  const opp = (dir + 2) % 4;
  let to = null;
  for (let t = 0; t < 50 && !to; t++) {
    const id = Math.floor(Math.random() * POOL);
    if (id === from.id) continue;
    const c = getChunk(id);
    if (c.links[opp] === -1) to = c;
  }
  if (!to) return null;
  from.links[dir] = to.id;
  to.links[opp] = from.id;
  return to;
}

export function join(p) {
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

export function leave(p) {
  p.chunk.players.delete(p);
  players.delete(p.id);
}

export function movePlayer(p, dx, dy) {      // false — не пошёл, true — шаг, 'chunk' — перешёл в другой чанк
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
  if (target) { hit(c, target, clock.tick); return 'hit'; }
  if (!canStep(c, p.x, p.y, nx, ny)) return false;
  p.x = nx; p.y = ny;
  return true;
}
