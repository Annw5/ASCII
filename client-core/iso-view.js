import { SEA } from '../shared/terrain.js';
import { CHUNK } from '../shared/chunk.js';
import { topColor, shade, wallColor, topGlyph, hash } from './palette.js';

// Символы для боковых стенок: левая светлее, правая темнее (цветом), и символы другие
const LEFT  = ['%', '&', '8'];
const RIGHT = ['#', 'H', 'M'];

// Рисуем один столбик: верхняя грань 4x2 символа и две стенки вниз до земли.
// sx — левая колонка, top — верхняя строка, h — высота, raw — настоящая высота (для цвета),
// x, y — координаты в чанке (нужны для хеша)
function drawBlock(screen, sx, top, h, raw, x, y) {
  const c = topColor(raw);

  // Верхняя грань. Фон всегда 0 (чёрный): цвет есть только у символа
  for (let r = 0; r < 2; r++) {
    for (let k = 0; k < 4; k++) {
      const g = hash(x * 4 + k, y * 2 + r, 1);
      // Яркость слегка меняется от символа к символу — поверхность «живая»
      const bright = 0.85 + ((g >>> 8) % 4) * 0.1;
      screen.put(sx + k, top + r, topGlyph(raw, g), shade(c, bright), 0);
    }
  }

  // Стенки: h строк вниз. i = 0 — самая верхняя строка стенки
  for (let i = 0; i < h; i++) {
    const row = top + 2 + i;
    const wc = wallColor(raw, i);
    for (let k = 0; k < 4; k++) {
      const g = hash(x * 4 + k, y * 64 + i, 2);
      if (k < 2) screen.put(sx + k, row, LEFT[g % LEFT.length],   shade(wc, 0.85), 0);
      else       screen.put(sx + k, row, RIGHT[g % RIGHT.length], shade(wc, 0.55), 0);
    }
  }
}

// Нарисовать чанк-куб по центру экрана
export function drawIso(screen, chunk, player) {
  // Самая высокая клетка чанка: от неё зависит высота всего куба на экране
  let maxH = SEA;
  for (const v of chunk) if (v > maxH) maxH = v;

  // Весь куб занимает по высоте: maxH (холмы) + 2 * CHUNK (ромб основания)
  const total = maxH + CHUNK * 2;
  const baseRow = ((screen.h - total) >> 1) + maxH;  // строка, где «земля» дальнего угла
  const cx = screen.w >> 1;                          // центр по горизонтали

  // s = x + y — номер диагонали. Идём от дальней (0) к ближней (2*CHUNK-2),
  // ближние рисуются позже и закрывают дальние (алгоритм художника)
  for (let s = 0; s <= CHUNK * 2 - 2; s++) {
    // На диагонали s допустимые x лежат между этими границами (y = s - x)
    const from = Math.max(0, s - (CHUNK - 1));
    const to = Math.min(CHUNK - 1, s);
    for (let x = from; x <= to; x++) {
      const y = s - x;
      const raw = chunk[y * CHUNK + x];
      const h = raw > SEA ? raw : SEA;        // вода рисуется на уровне моря
      const top = baseRow + s - h;            // верхняя строка блока
      const sx = cx + (x - y) * 2 - 2;        // левая колонка блока

      drawBlock(screen, sx, top, h, raw, x, y);
      if (x === player.x && y === player.y) {
        screen.put(sx + 1, top, '@', 0xffe14d, 0);  // игрок
      }
    }
  }
}
