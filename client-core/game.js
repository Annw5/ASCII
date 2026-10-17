import { SEA } from '../shared/terrain.js';
import { CHUNK, makeChunk } from '../shared/chunk.js';
import { drawIso } from './iso-view.js';

// Наш единственный чанк. Числа — место в большом мире. Поменяйте их — получите другой ландшафт
export const chunk = makeChunk(48, 36);

// Игрок: координаты внутри чанка (от 0 до CHUNK - 1)
export const player = { x: 0, y: 0 };

// Высота клетки чанка
function at(x, y) {
  return chunk[y * CHUNK + x];
}

// Ставим игрока на сушу ближе всего к центру чанка
export function spawn() {
  const mid = CHUNK / 2;
  let best = Infinity;                       // Infinity — «бесконечность», любое число меньше
  for (let y = 0; y < CHUNK; y++) {
    for (let x = 0; x < CHUNK; x++) {
      if (at(x, y) <= SEA) continue;         // вода — пропускаем
      const d = Math.abs(x - mid) + Math.abs(y - mid);   // расстояние до центра
      if (d < best) { best = d; player.x = x; player.y = y; }
    }
  }
}

// Шаг: нельзя выйти за край чанка, подняться больше чем на 1 уровень или зайти в воду
export function tryMove(dx, dy) {
  const nx = player.x + dx;
  const ny = player.y + dy;
  if (nx < 0 || ny < 0 || nx >= CHUNK || ny >= CHUNK) return;
  const next = at(nx, ny);
  if (next > SEA && Math.abs(next - at(player.x, player.y)) <= 1) {
    player.x = nx;
    player.y = ny;
  }
}

// Нарисовать кадр в экран-буфер
export function renderGame(screen) {
  screen.clear(0x000000);                    // чёрный фон
  drawIso(screen, chunk, player);
  const h = at(player.x, player.y);
  screen.text(1, 0, ` x:${player.x} y:${player.y} h:${h} `, 0x888888);
}
