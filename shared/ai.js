import { CHUNK } from './chunk.js';
import { SEA } from './terrain.js';
import { MOB_KINDS, NPC } from './objects.js';
import { canStep, occupied, makeMob } from './mob.js';

const DIRS = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
const PREDATORS = new Set(['волк','лиса','медведь','рысь','тигр','шакал','ирбис','песец','хорёк','сова']);

// Раз во сколько ходов мира существо действует (1 ход = TICK_MS). Больше число — медленнее
const SLOW = { npc: 4, pred: 3, prey: 4, preyHurt: 3 };

const isNpc  = (m) => m.kind === NPC;
const isPred = (m) => PREDATORS.has(MOB_KINDS[m.kind].name);
const isPrey = (m) => !isNpc(m) && !isPred(m);
const dist = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const nameOf = (o) => (o.kind ? MOB_KINDS[o.kind].name : 'игрока');

function period(m, tick) {
  if (isNpc(m)) return SLOW.npc;
  if (isPred(m)) return SLOW.pred;
  return m.hurt > tick ? SLOW.preyHurt : SLOW.prey;
}

function nearest(list, from, maxD) {
  let best = null, bd = maxD + 1;
  for (const o of list) {
    const d = dist(from, o);
    if (o !== from && d < bd) { bd = d; best = o; }
  }
  return best;
}

function okCell(c, x, y) {
  return x >= 2 && y >= 2 && x < CHUNK - 2 && y < CHUNK - 2 && c.heights[y * CHUNK + x] > SEA + 1;
}

function step(c, m, tx, ty, away = false) {
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
  if (dist(m, m.home) > 8) { m.act = 'возвращается'; step(c, m, m.home.x, m.home.y); return; }
  if (Math.random() < 0.5) {
    const [dx, dy] = DIRS[Math.floor(Math.random() * 8)];
    if (step(c, m, m.x + dx * 5, m.y + dy * 5)) { m.act = 'бродит'; return; }
  }
  m.act = 'стоит';
}

function hunter(c, m, tick) {
  if (m.fed > tick) { wander(c, m); m.act = `сыт, ${m.act}`; return; }
  const target = nearest(c.mobs.filter((o) => !o.dead && isPrey(o)), m, 7);
  if (!target) return wander(c, m);
  if (dist(m, target) <= 1) {
    target.dead = true;
    c.respawn.push({ at: tick + 80, kind: target.kind });
    m.fed = tick + 30;
    m.act = `съел: ${nameOf(target)}`;
    return;
  }
  m.act = `охотится: ${nameOf(target)}`;
  step(c, m, target.x, target.y);
}

// Жертва: от хищников бежит всегда, от игроков — только если её ударили
function prey(c, m, tick, players, preds) {
  const hurt = m.hurt > tick;
  const threat = nearest(hurt ? [...players, ...preds] : preds, m, hurt ? 8 : 5);
  if (threat) {
    m.act = `убегает от: ${nameOf(threat)}` + (hurt ? ' (ранен)' : '');
    step(c, m, threat.x, threat.y, true);
    return;
  }
  wander(c, m);
  if (hurt) m.act += ' (ранен)';
}

// NPC сам не говорит: реплики ставит talk() при шаге игрока в NPC
function npc(c, m, tick, players, preds) {
  if (m.say) { m.act = 'разговаривает'; return; }        // пока говорит — стоит
  const pr = nearest(preds, m, 4);
  if (pr) { m.act = `убегает от: ${nameOf(pr)}`; step(c, m, pr.x, pr.y, true); return; }
  const p = nearest(players, m, 8);
  if (!p) return wander(c, m);
  if (dist(m, p) > 2) { m.act = 'идёт к игроку'; step(c, m, p.x, p.y); return; }
  m.act = 'рядом с игроком';
}

function respawn(c, tick) {
  c.respawn = c.respawn.filter((r) => {
    if (r.at > tick) return true;
    for (let t = 0; t < 30; t++) {
      const x = 2 + Math.floor(Math.random() * (CHUNK - 4));
      const y = 2 + Math.floor(Math.random() * (CHUNK - 4));
      if (okCell(c, x, y) && !occupied(c, x, y)) { c.mobs.push(makeMob(x, y, r.kind)); return false; }
    }
    return true;
  });
}

export function tickChunk(c, tick) {
  respawn(c, tick);
  const players = [...c.players];
  const preds = c.mobs.filter(isPred);
  for (const m of [...c.mobs]) {
    if (m.say && tick >= m.sayUntil) { m.say = null; m.sayTo = null; }   // реплика исчезает сама
    if (m.dead) continue;
    if ((tick + m.id) % period(m, tick) !== 0) continue;                // ещё не его очередь
    if (isNpc(m)) npc(c, m, tick, players, preds);
    else if (isPred(m)) hunter(c, m, tick);
    else prey(c, m, tick, players, preds);
  }
  c.mobs = c.mobs.filter((m) => !m.dead);
}
