import { SEA } from '../shared/terrain.js';              // берём из terrain.js уровень моря SEA
import { CHUNK, makeChunk } from '../shared/chunk.js';   // берём размер чанка и функцию, которая его создаёт
import { drawIso } from './iso-view.js';                 // берём функцию, которая рисует чанк

export const chunk = makeChunk(20, 12);                  // создаём чанк; 20 и 12 — место в большом мире

export const player = { x: 0, y: 0 };                    // игрок: объект с координатами внутри чанка

function at(x, y) {                                      // функция: высота клетки (x, y)
  return chunk[y * CHUNK + x];                           // номер в списке = строка * ширина + столбец
}                                                        // конец функции at

export function viewSize() {                             // сколько колонок и строк нужно, чтобы чанк влез целиком
  let maxH = SEA;                                        // maxH — самая высокая клетка; начинаем с уровня моря
  for (const v of chunk) if (v > maxH) maxH = v;         // перебираем все высоты; нашли выше — запоминаем
  return {                                               // возвращаем объект с двумя числами
    cols: CHUNK * 2 + 4,                                 // ширина рисунка 2*CHUNK колонок, плюс по 2 запаса с краёв
    rows: maxH + CHUNK + 4,                              // высота: холмы (maxH) + основание (CHUNK) + запас сверху для @ и надписи
  };                                                     // конец объекта
}                                                        // конец функции viewSize

export function spawn() {                                // поставить игрока на сушу у центра чанка
  const mid = CHUNK / 2;                                 // mid — середина чанка
  let best = Infinity;                                   // best — лучшее найденное расстояние до центра; Infinity — «бесконечность»
  for (let y = 0; y < CHUNK; y++) {                      // перебираем строки чанка
    for (let x = 0; x < CHUNK; x++) {                    // в каждой строке перебираем столбцы
      if (at(x, y) <= SEA) continue;                     // вода — пропускаем эту клетку и идём к следующей
      const d = Math.abs(x - mid) + Math.abs(y - mid);   // d — расстояние от клетки до центра
      if (d < best) { best = d; player.x = x; player.y = y; }   // ближе прежнего — запоминаем и ставим туда игрока
    }                                                    // конец цикла по x
  }                                                      // конец цикла по y
}                                                        // конец функции spawn

export function tryMove(dx, dy) {                        // попытка шагнуть на (dx, dy); это всегда ровно 1 клетка
  const nx = player.x + dx;                              // nx — новая координата x
  const ny = player.y + dy;                              // ny — новая координата y
  if (nx < 0 || ny < 0 || nx >= CHUNK || ny >= CHUNK) return;   // вышли за край чанка — отмена
  const next = at(nx, ny);                               // высота клетки, куда хотим шагнуть
  if (next > SEA && Math.abs(next - at(player.x, player.y)) <= 1) {   // не вода и перепад не больше 1
    player.x = nx;                                       // шагаем: записываем новый x
    player.y = ny;                                       // и новый y
  }                                                      // конец if
}                                                        // конец функции tryMove

export function renderGame(screen) {                     // нарисовать кадр в экран-буфер
  screen.clear(0x000000);                                // залить экран чёрным
  drawIso(screen, chunk, player);                        // нарисовать чанк и игрока
  const h = at(player.x, player.y);                      // высота под игроком
  screen.text(1, 0, ` x:${player.x} y:${player.y} h:${h} `, 0x888888);   // серая надпись в левом верхнем углу
}                                                        // конец функции renderGame
