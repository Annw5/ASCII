import { CHUNK, SEA, MOB_KINDS, NPC, makeChunk, makeObjects, makeMobs } from './world.js';

export const clock = { tick: 0 };
let nextId = 1;
export const newId = () => nextId++;         // общий счётчик id для зверей и игроков

export function makeMob(x, y, kind) {
  return { id: newId(), x, y, kind, home: { x, y }, mem: new Map(),
           say: null, sayTo: null, sayUntil: 0, act: 'стоит',
           fed: 0, hurt: 0, hp: 2, maxHp: 2, dead: false };
}

export function newChunk(id) {               // полный чанк: высоты, предметы, существа
  const heights = makeChunk(id * 37, id * 61);
  const objs = makeObjects(id, heights);
  return { id, heights, objs,
           mobs: makeMobs(id, heights, objs).map((m) => makeMob(m.x, m.y, m.kind)),
           links: [-1, -1, -1, -1], players: new Set(), respawn: [] };
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

export const mobAt = (c, x, y) => c.mobs.find((m) => m.x === x && m.y === y) || null;

function drop(m) {                           // 40% ничего, 20% шкура, 30% мясо, 10% и то и другое
  const r = Math.random();
  if (r < 0.4) return [];
  if (r < 0.6) return [100 + m.kind];
  if (r < 0.9) return [3];
  return [100 + m.kind, 3];
}

function hit(c, m, p, tick) {                // удар по зверю
  m.hurt = tick + 20;
  m.hp -= 1;
  if (m.hp <= 0) {
    m.dead = true;
    c.respawn.push({ at: tick + 80, kind: m.kind });
    c.mobs = c.mobs.filter((o) => !o.dead);
    if (p.inv) for (const d of drop(m)) p.inv[d] = (p.inv[d] || 0) + 1;
  }
}

function talk(m, p, tick) {                  // реплика только для игрока p
  const seen = m.mem.get(p.id);
  const n = seen ? seen.n : 0;
  const lines = [`Привет, ${p.name}!`, `Опять ты, ${p.name}!`, `Как дела, ${p.name}?`, `Не заблудись, ${p.name}.`];
  m.say = lines[n % lines.length];
  m.sayTo = p.id;
  m.sayUntil = tick + 10;
  m.act = 'торгует';
  m.mem.set(p.id, { n: n + 1, last: tick });
}

// шаг в существо: NPC — торговля ('trade'), зверь — удар ('hit')
export function interact(c, m, p, tick) {
  if (m.kind === NPC) { talk(m, p, tick); return 'trade'; }
  hit(c, m, p, tick);
  return 'hit';
}

export const mobView = (m, forId) => ({      // что сервер шлёт игроку forId
  id: m.id, x: m.x, y: m.y, kind: m.kind, hp: m.hp, maxHp: m.maxHp, act: m.act,
  say: m.sayTo === forId ? m.say : null,
});

// ---------- ИИ ----------
const DIRS = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
const PREDATORS = new Set(['волк','лиса','медведь','рысь','тигр','шакал','ирбис','песец','хорёк','сова']);
const SLOW = { npc: 4, pred: 3, prey: 4, preyHurt: 3 };   // раз во сколько ходов существо действует

const isNpc  = (m) => m.kind === NPC;
const isPred = (m) => PREDATORS.has(MOB_KINDS[m.kind].name);
const isPrey = (m) => !isNpc(m) && !isPred(m);
const dist = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const nameOf = (o) => (o.kind ? MOB_KINDS[o.kind].name : 'игрока');

function period(m, tick) {
  if (isNpc(m)) return SLOW.npc;
  if (m.hurt > tick) return SLOW.preyHurt;
  return isPred(m) ? SLOW.pred : SLOW.prey;
}

function nearest(list, from, maxD) {
  let best = null, bd = maxD + 1;
  for (const o of list) {
    const d = dist(from, o);
    if (o !== from && d < bd) { bd = d; best = o; }
  }
  return best;
}

const okCell = (c, x, y) =>
  x >= 2 && y >= 2 && x < CHUNK - 2 && y < CHUNK - 2 && c.heights[y * CHUNK + x] > SEA + 1;

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

function hunter(c, m, tick, players) {
  if (m.hurt > tick) {                       // ударили — убегает от игрока, не охотится
    const p = nearest(players, m, 8);
    if (p) { m.act = 'убегает от: игрока (ранен)'; step(c, m, p.x, p.y, true); return; }
  }
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

function prey(c, m, tick, players, preds) {  // от хищников бежит всегда, от игроков — если ранена
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

function npc(c, m, tick, players, preds) {   // реплики ставит только talk()
  if (m.say) { m.act = 'торгует'; return; }
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
    if (m.say && tick >= m.sayUntil) { m.say = null; m.sayTo = null; }
    if (m.dead) continue;
    if ((tick + m.id) % period(m, tick) !== 0) continue;
    if (isNpc(m)) npc(c, m, tick, players, preds);
    else if (isPred(m)) hunter(c, m, tick, players);
    else prey(c, m, tick, players, preds);
  }
  c.mobs = c.mobs.filter((m) => !m.dead);
                                                      }
