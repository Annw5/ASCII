import { CHUNK } from '../shared/chunk.js';
import { SEA } from '../shared/terrain.js';
import { MOB_KINDS, NPC } from '../shared/objects.js';
import { canStep, occupied, makeMob } from './world.js';

const DIRS = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
const PREDATORS = new Set(['волк','лиса','медведь','рысь','тигр','шакал','ирбис','песец','хорёк','сова']);

const isNpc  = (m) => m.kind === NPC;
const isPred = (m) => PREDATORS.has(MOB_KINDS[m.kind].name);
const isPrey = (m) => !isNpc(m) && !isPred(m);
const dist = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

function nearest(list, from, maxD) {
  let best = null, bd = maxD + 1;
  for (const o of list) {
    const d = dist(from, o);
    if (o !== from && d < bd) { bd = d; best = o; }
  }
  return best;
}

function okCell(c, x, y) {                   // звери не выходят к краю чанка и не лезут в воду и на песок
  return x >= 2 && y >= 2 && x < CHUNK - 2 && y < CHUNK - 2 && c.heights[y * CHUNK + x] > SEA + 1;
}

function step(c, m, tx, ty, away = false) { // один шаг к точке (или от неё)
  let best = null, bd = away ? -1 : Infinity;
  for (const [dx, dy] of DIRS) {
    const nx = m.x + dx, ny = m.y + dy;
    if (!okCell(c, nx, ny) || !canStep(c, m.x, m.y, nx, ny)) continue;
    const d = (nx - tx) ** 2 + (ny - ty) ** 2 + Math.random() * 0.5;
    if (away ? d > bd : d < bd) { bd = d; best = [nx, ny]; }
  }
  if (!best) return false;
  m.x = best[0]; m.y = best[1];
  return true;
}

function wander(c, m) {
  if (dist(m, m.home) > 8) { step(c, m, m.home.x, m.home.y); return; }
  if (Math.random() < 0.35) {
    const [dx, dy] = DIRS[Math.floor(Math.random() * 8)];
    step(c, m, m.x + dx * 5, m.y + dy * 5);
  }
}

function say(m, text, tick) { m.say = text; m.sayUntil = tick + 6; }

function hunter(c, m, tick) {
  if (m.fed > tick) return wander(c, m);
  const target = nearest(c.mobs.filter((o) => !o.dead && isPrey(o)), m, 7);
  if (!target) return wander(c, m);
  if (dist(m, target) <= 1) {
    target.dead = true;
    c.respawn.push({ at: tick + 80, kind: target.kind });
    m.fed = tick + 30;
    return;
  }
  step(c, m, target.x, target.y);
}

function prey(c, m, tick, players, preds) {
  const threat = nearest([...players, ...preds], m, 5);
  if (threat) {
    if ((tick + m.id) % 3 !== 0) step(c, m, threat.x, threat.y, true);   // бежит на 1/3 медленнее хищника
    return;
  }
  wander(c, m);
}

function npc(c, m, tick, players, preds) {
  const pr = nearest(preds, m, 4);
  if (pr) { say(m, `Ой, ${MOB_KINDS[pr.kind].name}!`, tick); step(c, m, pr.x, pr.y, true); return; }
  const p = nearest(players, m, 8);
  if (!p) return wander(c, m);
  if (dist(m, p) > 2) { step(c, m, p.x, p.y); return; }
  const seen = m.mem.get(p.id);              // память: кого и когда NPC уже приветствовал
  if (!seen || tick - seen.last > 120) {
    const n = seen ? seen.n : 0;
    say(m, n === 0 ? `Привет, ${p.name}!` : `Опять ты, ${p.name}!`, tick);
    m.mem.set(p.id, { n: n + 1, last: tick });
  }
}

function respawn(c, tick) {
  c.respawn = c.respawn.filter((r) => {
    if (r.at > tick) return true;
    for (let t = 0; t < 30; t++) {
      const x = 2 + Math.floor(Math.random() * (CHUNK - 4));
      const y = 2 + Math.floor(Math.random() * (CHUNK - 4));
      if (okCell(c, x, y) && !occupied(c, x, y)) { c.mobs.push(makeMob(x, y, r.kind)); return false; }
    }
    return true;                             // места не нашлось — попробуем на следующем ходу
  });
}

export function tickChunk(c, tick) {
  respawn(c, tick);
  const players = [...c.players];
  const preds = c.mobs.filter(isPred);
  for (const m of [...c.mobs]) {
    if (m.dead) continue;
    if (isNpc(m)) npc(c, m, tick, players, preds);
    else if (isPred(m)) hunter(c, m, tick);
    else prey(c, m, tick, players, preds);
  }
  c.mobs = c.mobs.filter((m) => !m.dead);
}
