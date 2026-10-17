import { SEA, MAXH } from '../shared/terrain.js';        // уровень моря и максимальная высота
import { CHUNK } from '../shared/chunk.js';              // размер чанка
import { world, start, go, N, E, S, W } from '../shared/pool.js';   // пул чанков и стороны света
import { drawIso } from './iso-view.js';                 // функция рисования чанка

export const player = { x: 0, y: 0 };                    // игрок: координаты внутри текущего чанка

function at(x, y) {                                      // высота клетки (x, y) текущего чанка
  return world.cur.heights[y * CHUNK + x];               // номер в списке = строка * ширина + столбец
}                                                        // конец at

export function viewSize() {                             // сколько колонок и строк нужно, чтобы чанк влез
  return {                                               // возвращаем объект с двумя числами
    cols: CHUNK * 2 + 4,                                 // ширина рисунка + запас по краям
    rows: MAXH + CHUNK + 4,                              // самая высокая возможная гора + основание + запас
  };                                                     // конец объекта
}                                                        // конец viewSize

export function spawn() {                                // начало игры
  start();                                               // выбираем случайный чанк
  const mid = CHUNK / 2;                                 // середина чанка
  let best = Infinity;                                   // лучшее расстояние до центра
  for (let y = 0; y < CHUNK; y++) {                      // перебираем строки
    for (let x = 0; x < CHUNK; x++) {                    // перебираем столбцы
      if (at(x, y) <= SEA) continue;                     // вода — пропускаем
      const d = Math.abs(x - mid) + Math.abs(y - mid);   // расстояние до центра
      if (d < best) { best = d; player.x = x; player.y = y; }   // ближе — запоминаем
    }                                                    // конец цикла по x
  }                                                      // конец цикла по y
}                                                        // конец spawn

export function tryMove(dx, dy) {                        // попытка шагнуть на (dx, dy)
  let nx = player.x + dx;                                // новый x
  let ny = player.y + dy;                                // новый y
  let dirX = -1, dirY = -1;                              // через какую сторону вышли (-1 — ни через какую)
  if (nx < 0)           { dirX = W; nx = CHUNK - 1; }    // вышли влево: попадём на правый край соседа
  else if (nx >= CHUNK) { dirX = E; nx = 0; }            // вышли вправо: на левый край соседа
  if (ny < 0)           { dirY = N; ny = CHUNK - 1; }    // вышли вверх: на нижний край соседа
  else if (ny >= CHUNK) { dirY = S; ny = 0; }            // вышли вниз: на верхний край соседа

  if (dirX !== -1 && dirY !== -1) return;                // угол чанка: пока не пускаем (позже добавим диагональный чанк)

  if (dirX !== -1 || dirY !== -1) {                      // пересекаем границу чанка?
    go(dirX !== -1 ? dirX : dirY);                       // переходим в соседний чанк (край у всех чанков одной высоты, шаг всегда возможен)
    player.x = nx;                                       // ставим игрока на новое место
    player.y = ny;                                       // (координата вдоль границы сохраняется)
    return;                                              // шаг сделан
  }                                                      // конец if

  const next = at(nx, ny);                               // высота клетки, куда шагаем
  if (next > SEA && Math.abs(next - at(player.x, player.y)) <= 1) {   // не вода, перепад не больше 1
    player.x = nx;                                       // шагаем
    player.y = ny;                                       // шагаем
  }                                                      // конец if
}                                                        // конец tryMove

export function renderGame(screen) {                     // нарисовать кадр
  screen.clear(0x000000);                                // чёрный фон
  drawIso(screen, world.cur.heights, player);            // рисуем текущий чанк и игрока
  const h = at(player.x, player.y);                      // высота под игроком
  screen.text(1, 0, ` chunk:${world.cur.id} x:${player.x} y:${player.y} h:${h} `, 0x888888);   // подпись
}                                                        // конец renderGame
