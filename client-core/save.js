import { POOL } from '../shared/pool.js';
import { CHUNK } from '../shared/chunk.js';

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
