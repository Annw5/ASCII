import { SEA, MAXH } from '../shared/terrain.js';        // уровень моря и максимальная высота
import { CHUNK } from '../shared/chunk.js';              // размер чанка
import { world, start, go, N, E, S, W } from '../shared/pool.js';   // пул чанков и стороны света
import { drawIso } from './iso-view.js';                 // функция рисования чанка

export const player = { x: 0, y: 0 };                    // игрок: координаты внутри текущего чанка

function at(x, y) {                                      // высота клетки (x, y) текущего чанка
  return world.cur.heights[y * CHUNK + x];               // номер в списке = строка * ширина + столбец
}                                                        // конец at

function blocked(x, y) {                                 // занята ли клетка деревом, камнем или существом
  const c = world.cur;                                   // текущий чанк
  if (c.objs[y * CHUNK + x] !== 0) return true;          // стоит предмет — занята
  return c.mobs.some((m) => m.x === x && m.y === y);     // some — «есть ли хоть один»; стоит существо — занята
}                                                        // конец blocked

export function viewSize() {                             // сколько колонок и строк нужно, чтобы чанк влез
  return {                                               // возвращаем объект с двумя числами
    cols: CHUNK * 2 + 4,                                 // ширина рисунка + запас по краям
    rows: ((MAXH + 1) >> 1) + CHUNK + 6,                 // высота: холмы (1 уровень = полстроки) + основание + запас сверху для @ и надписи
  };                                                     // конец объекта
}                                                        // конец viewSize

export function spawn() {                                // начало игры
  start();                                               // выбираем случайный чанк
  const mid = CHUNK / 2;                                 // середина чанка
  let best = Infinity;                                   // лучшее расстояние до центра
  for (let y = 0; y < CHUNK; y++) {                      // перебираем строки
    for (let x = 0; x < CHUNK; x++) {                    // перебираем столбцы
      if (at(x, y) <= SEA || blocked(x, y)) continue;    // вода или занятая клетка — пропускаем
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

  if (dirX !== -1 && dirY !== -1) return;                // угол чанка: пока не пускаем

  if (dirX !== -1 || dirY !== -1) {                      // пересекаем границу чанка?
    go(dirX !== -1 ? dirX : dirY);                       // переходим в соседний чанк
    player.x = nx;                                       // ставим игрока на новое место
    player.y = ny;                                       // координата вдоль границы сохраняется
    return;                                              // шаг сделан, выходим
  }                                                      // конец if

  const next = at(nx, ny);                               // высота клетки, куда шагаем (объявляем ДО использования)
  if (next > SEA && Math.abs(next - at(player.x, player.y)) <= 1 && !blocked(nx, ny)) {   // не вода, перепад ≤ 1, клетка свободна
    player.x = nx;                                       // шагаем
    player.y = ny;                                       // шагаем
  }                                                      // конец if
}                                                        // конец tryMove

  if (dirX !== -1 && dirY !== -1) return;                // угол чанка: пока не пускаем (позже добавим диагональный чанк)

  if (next > SEA && Math.abs(next - at(player.x, player.y)) <= 1 && !blocked(nx, ny)) {   // не вода, перепад ≤ 1 и клетка свободна
     
  }                                                      // конец if

  const next = at(nx, ny);                               // высота клетки, куда шагаем
  if (next > SEA && Math.abs(next - at(player.x, player.y)) <= 1) {   // не вода, перепад не больше 1
    player.x = nx;                                       // шагаем
    player.y = ny;                                       // шагаем
  }                                                      // конец if
}                                                        // конец tryMove

export function renderGame(screen) {                     // нарисовать кадр
  screen.clear(0x000000);                                // чёрный фон
    drawIso(screen, world.cur.heights, player, world.cur.objs, world.cur.mobs);   // передаём ещё предметы (objs) и существ (mobs)
  const h = at(player.x, player.y);                      // высота под игроком
  screen.text(1, 0, ` chunk:${world.cur.id} x:${player.x} y:${player.y} h:${h} `, 0x888888);   // подпись
}                                                        // конец renderGame
