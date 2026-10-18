import { makeChunk } from './chunk.js';                  // функция создания чанка
import { makeObjects, makeMobs } from './objects.js';    // деревья, камни, существа

export const POOL = 100;                                 // сколько всего чанков в «листе в клеточку»
export const N = 0, E = 1, S = 2, W = 3;                 // номера сторон: север, восток, юг, запад

const loaded = new Map();                                // Map — «словарь»: номер чанка -> сам чанк (только загруженные)
export const world = { cur: null };                      // world.cur — чанк, в котором сейчас игрок

function load(id) {                                      // получить чанк по номеру (создать, если не загружен)
  if (loaded.has(id)) return loaded.get(id);             // уже есть — отдаём его
  const c = {                                            // новый чанк — объект с тремя полями
    id,                                                  // номер в листе
    heights: makeChunk(id * 37, id * 61),                // высоты; место в мире зависит от номера, поэтому у каждого номера свой вид
    links: [-1, -1, -1, -1],                             // с кем соединён по сторонам N, E, S, W; -1 — пока ни с кем
  };                                                     // конец объекта
  loaded.set(id, c);                                     // запоминаем в словаре
  return c;                                              // отдаём
}                                                        // конец load

export function start() {                                // первый вход в мир
  world.cur = load(Math.floor(Math.random() * POOL));    // случайный номер от 0 до POOL-1
}                                                        // конец start

function pick(from, dir) {                               // выбрать случайного соседа для стороны dir
  const opp = (dir + 2) % 4;                             // противоположная сторона (N<->S, E<->W)
  for (let t = 0; t < 50; t++) {                         // до 50 попыток
    const id = Math.floor(Math.random() * POOL);         // случайный номер
    if (id === from.id) continue;                        // сам с собой не соединяем
    const c = loaded.get(id);                            // вдруг он уже загружен (занят)
    if (c && c.links[opp] !== -1) continue;              // у него нужная сторона уже занята — не подходит
    return id;                                           // подходит
  }                                                      // конец цикла попыток
  return (from.id + 1) % POOL;                           // запасной вариант: следующий номер
}                                                        // конец pick

export function go(dir) {                                // игрок пересёк край чанка в сторону dir
  const from = world.cur;                                // откуда уходим
  let to = from.links[dir];                              // уже есть сосед с этой стороны?
  if (to === -1) {                                       // нет — рандомайзер выбирает
    to = pick(from, dir);                                // случайный номер
    from.links[dir] = to;                                // запоминаем связь
  }                                                      // конец if
  const next = load(to);                                 // загружаем (или берём готовый) чанк-сосед
  next.links[(dir + 2) % 4] = from.id;                   // двусторонняя связь: он знает дорогу назад
  world.cur = next;                                      // игрок теперь в нём
  for (const id of [...loaded.keys()]) {                 // чистим память: перебираем номера загруженных чанков
    if (id !== next.id && id !== from.id) loaded.delete(id);   // «свободные» удаляем, остаются текущий и предыдущий
  }                                                      // конец цикла
  for (const c of loaded.values()) {                     // у оставшихся стираем связи с удалёнными
    for (let i = 0; i < 4; i++) if (!loaded.has(c.links[i])) c.links[i] = -1;   // нет в памяти — связь забыта
  }                                                      // конец цикла
}                                                        // конец go
