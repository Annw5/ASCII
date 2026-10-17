import { SEA } from '../shared/terrain.js';
import { CHUNK } from '../shared/chunk.js';
import { topColor, shade, wallColor, topGlyph, hash } from './palette.js';

// Символы для стенок. Левая и правая грани отличаются и символами, и яркостью
const LEFT  = ['%', '&', '8'];
const RIGHT = ['#', 'H', 'M'];

// Высота клетки для расчёта стенок: вода считается на уровне моря,
// за краем чанка — 0 (там пустота)
function hAt(chunk, x, y) {
  if (x < 0 || y < 0 || x >= CHUNK || y >= CHUNK) return 0;
  const v = chunk[y * CHUNK + x];
  return v > SEA ? v : SEA;
}

// Нарисовать чанк-куб по центру экрана
export function drawIso(screen, chunk, player) {
  // Самая высокая клетка: от неё зависит высота всего рисунка
  let maxH = SEA;
  for (const v of chunk) if (v > maxH) maxH = v;

  // Рисунок занимает по высоте: maxH (холмы) + CHUNK (основание-ромб: (2*CHUNK-2)/2 строк)
  const total = maxH + CHUNK;
  const baseRow = ((screen.h - total) >> 1) + maxH;  // строка «земли» у дальнего угла
  const cx = screen.w >> 1;                          // центр по горизонтали

  // s = x + y — номер диагонали. От дальней (0) к ближней: ближние рисуются позже
  // и закрывают дальние (алгоритм художника)
  for (let s = 0; s <= CHUNK * 2 - 2; s++) {
    const from = Math.max(0, s - (CHUNK - 1));
    const to = Math.min(CHUNK - 1, s);
    for (let x = from; x <= to; x++) {
      const y = s - x;
      const raw = chunk[y * CHUNK + x];
      const h = raw > SEA ? raw : SEA;      // вода рисуется на уровне моря

      const col = cx + x - y;               // колонка: ровно 1 символ на шаг
      const top = baseRow + (s >> 1) - h;   // строка верхушки (s >> 1 — это s / 2 без остатка)

      // Верхушка столбика — ОДИН символ
      const g = hash(x, y, 1);
      const bright = 0.85 + ((g >>> 8) % 4) * 0.1;   // лёгкая «живость» яркости
      screen.put(col, top, topGlyph(raw, g), shade(topColor(raw), bright), 0);

      // Какая стенка видна: правая, если справа-спереди (x+1) клетка ниже, иначе левая
      const hRight = hAt(chunk, x + 1, y);

      // Под верхушкой — h символов стенки, по одному на каждый уровень высоты
      for (let i = 0; i < h; i++) {
        const z = h - 1 - i;                 // на какой высоте этот уровень стенки
        const wc = wallColor(raw, i);
        const gw = hash(x, y, i + 2);
        if (z >= hRight) screen.put(col, top + 1 + i, RIGHT[gw % RIGHT.length], shade(wc, 0.55), 0);
        else             screen.put(col, top + 1 + i, LEFT[gw % LEFT.length],   shade(wc, 0.85), 0);
      }

      if (x === player.x && y === player.y) {
        screen.put(col, top - 1, '@', 0xffe14d, 0);   // игрок стоит НАД клеткой, на 1 символ выше
      }
    }
  }
}
