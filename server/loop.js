import { tickChunk } from '../shared/ai.js';
import { players, clock } from './world.js';
import { TICK_MS } from '../shared/constants.js';

export function startLoop() {
  setInterval(() => {
    clock.tick++;
    const active = new Set([...players.values()].map((p) => p.chunk));   // ходят только чанки, где есть игроки
    for (const c of active) tickChunk(c, clock.tick);
    // ... дальше ваша рассылка `state` каждому игроку
  }, TICK_MS);
}
