import { CHUNK } from './chunk.js';
import { SEA } from './terrain.js';
import { NPC } from './objects.js';

export const clock = { tick: 0 };
let nextId = 1;
export const newId = () => nextId++;

export function makeMob(x, y, kind) {
  return { id: newId(), x, y, kind, home: { x, y }, mem: new Map(),
           say: null, sayUntil: 0, fed: 0, hurt: 0, hp: 2, dead: false };
}

export function occupied(c, x, y) {
  if (c.objs[y * CHUNK + x] !== 0) return true;
  for (const m of c.mobs) if (m.x === x && m.y === y) return true;
  for (const p of c.players) if (p.x === x && p.y === y) return true;
  return false;
}

export function canStep(c, x, y, nx, ny) {
  const h = c.heights;
  const next = h[ny * CHUNK + nx];
  return next > SEA && Math.abs(next - h[y * CHUNK + x]) <= 1 && !occupied(c, nx, ny);
}

export function mobAt(c, x, y) {
  return c.mobs.find((m) => m.x === x && m.y === y) || null;
}

// Удар по зверю или NPC
export function hit(c, m, tick) {
  m.hurt = tick + 20;                                    // 20 ходов «ранен» и убегает
  if (m.kind === NPC) return;                            // NPC не умирают, только пугаются
  m.hp -= 1;
  if (m.hp <= 0) {
    m.dead = true;
    c.respawn.push({ at: tick + 80, kind: m.kind });
    c.mobs = c.mobs.filter((o) => !o.dead);              // убираем сразу, не ждём хода
  }
}
