import { SEA, MAXH } from '../shared/terrain.js';        // уровень моря и максимальная высота
import { CHUNK } from '../shared/chunk.js';              // размер чанка
import { topColor, shade, wallColor, topGlyph, hash } from './palette.js';   // цвета, символы и «случайность»

const LEFT  = ['%', '&', '8'];                           // символы левой стенки
const RIGHT = ['#', 'H', 'M'];                           // символы правой стенки

function hAt(chunk, x, y) {                              // высота клетки для расчёта стенок
  if (x < 0 || y < 0 || x >= CHUNK || y >= CHUNK) return 0;   // за краем чанка высота 0
  const v = chunk[y * CHUNK + x];                        // берём высоту из списка
  return v > SEA ? v : SEA;                              // вода считается на уровне моря
}                                                        // конец функции hAt

export function drawIso(screen, chunk, player) {         // нарисовать чанк-куб по центру экрана
   let maxH = SEA;
  for (const v of chunk) if (v > maxH) maxH = v;

  const total = maxH + CHUNK;                            // сколько строк занимает рисунок по высоте
  const baseRow = ((screen.h - total) >> 1) + maxH;      // строка «земли» у дальнего угла; >> 1 — деление на 2 без остатка
  const cx = screen.w >> 1;                              // центральная колонка экрана

  let pCol = -1, pRow = -1;                              // где нарисовать игрока; -1 — пока не знаем

  for (let s = 0; s <= CHUNK * 2 - 2; s++) {             // s = x + y — номер диагонали; идём от дальней к ближней
    const from = Math.max(0, s - (CHUNK - 1));           // наименьший допустимый x на этой диагонали
    const to = Math.min(CHUNK - 1, s);                   // наибольший допустимый x на этой диагонали
    for (let x = from; x <= to; x++) {                   // перебираем клетки диагонали
      const y = s - x;                                   // y получаем из s и x
      const raw = chunk[y * CHUNK + x];                  // настоящая высота клетки
      const h = raw > SEA ? raw : SEA;                   // высота для рисования: воду рисуем на уровне моря

      const col = cx + x - y;                            // колонка на экране: 1 символ на шаг
      const top = baseRow + (s >> 1) - h;                // строка верхушки: половина диагонали минус высота

      const g = hash(x, y, 1);                           // «случайное», но постоянное число для этой клетки
      const bright = 0.85 + ((g >>> 8) % 4) * 0.1;       // небольшой разброс яркости: 0.85 ... 1.15
      screen.put(col, top, topGlyph(raw, g), shade(topColor(raw), bright), 0);   // верхушка: ОДИН цветной символ на чёрном

      const hRight = hAt(chunk, x + 1, y);               // высота соседа справа-спереди (решает, какая стенка видна)

      for (let i = 0; i < h; i++) {                      // стенка: по одному символу на каждый уровень высоты
        const z = h - 1 - i;                             // z — на какой высоте лежит этот символ стенки
        const wc = wallColor(raw, i);                    // цвет стенки на глубине i
        const gw = hash(x, y, i + 2);                    // постоянное «случайное» число для выбора символа
        if (z >= hRight) {                               // сосед справа ниже: видна правая (тёмная) грань
          screen.put(col, top + 1 + i, RIGHT[gw % RIGHT.length], shade(wc, 0.55), 0);   // тёмный символ
        } else {                                         // иначе видна левая (светлая) грань
          screen.put(col, top + 1 + i, LEFT[gw % LEFT.length], shade(wc, 0.85), 0);     // светлый символ
        }                                                // конец if/else
      }                                                  // конец цикла по высоте

      if (x === player.x && y === player.y) {            // эта клетка — под игроком?
        pCol = col;                                      // запоминаем колонку игрока
        pRow = top - 1;                                  // и строку: на 1 выше верхушки
      }                                                  // конец if
    }                                                    // конец цикла по x
  }                                                      // конец цикла по диагоналям

  if (pCol >= 0) screen.put(pCol, pRow, '@', 0xffe14d, 0);   // игрока рисуем ПОСЛЕДНИМ, чтобы его ничто не закрыло
}                                                        // конец функции drawIso
