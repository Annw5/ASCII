import { CHUNK } from './chunk.js';
import { SEA } from './terrain.js';
import { NPC } from './objects.js';

export const clock = { tick: 0 };
let nextId = 1;
export const newId = () => nextId++;

export function makeMob(x, y, kind) {
  return { id: newId(), x, y, kind, home: { x, y }, mem: new Map(),
           say: null, sayTo: null, sayUntil: 0, act: 'стоит',
           fed: 0, hurt: 0, hp: 2, maxHp: 2, dead: false };
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

// Удар по зверю
export function hit(c, m, tick) {
  m.hurt = tick + 20;                                    // 20 ходов «ранен» и убегает
  m.hp -= 1;
  if (m.hp <= 0) {
    m.dead = true;
    c.respawn.push({ at: tick + 80, kind: m.kind });
    c.mobs = c.mobs.filter((o) => !o.dead);
  }
}

// Разговор с NPC: реплика предназначена только этому игроку (p.id)
export function talk(m, p, tick) {
  const seen = m.mem.get(p.id);
  const n = seen ? seen.n : 0;
  const lines = [`Привет, ${p.name}!`, `Опять ты, ${p.name}!`, `Как дела, ${p.name}?`, `Не заблудись, ${p.name}.`];
  m.say = lines[n % lines.length];
  m.sayTo = p.id;
  m.sayUntil = tick + 10;
  m.act = 'разговаривает';
  m.mem.set(p.id, { n: n + 1, last: tick });
}

// Шаг игрока в существо: NPC — разговор, зверь — удар
export function interact(c, m, p, tick) {
  if (m.kind === NPC) talk(m, p, tick);
  else hit(c, m, tick);
}

// Что сервер отправляет игроку forId: реплику видит только адресат
export function mobView(m, forId) {
  return { id: m.id, x: m.x, y: m.y, kind: m.kind, hp: m.hp, maxHp: m.maxHp, act: m.act,
           say: m.sayTo === forId ? m.say : null };
}
