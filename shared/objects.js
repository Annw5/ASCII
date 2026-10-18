import { SEA } from './terrain.js';                      // уровень моря
import { CHUNK } from './chunk.js';                      // размер чанка
import { hash } from './hash.js';                        // «случайность» без Math.random

export const TREE = 1, ROCK = 2;                         // номера неподвижных предметов (0 — пусто)

export const OBJ_KINDS = [                               // как рисовать предмет: номер в списке = номер вида
  null,                                                  // 0 — пусто, рисовать нечего
  { glyph: '♣', color: 0x1f7a2f },                       // 1 — дерево: тёмно-зелёное, темнее травы
  { glyph: 'o',  color: 0xb0b0b0 },                      // 2 — камень: светло-серый
];                                                       // конец списка

export const MOB_KINDS = [                               // живые существа; яркие цвета, чтобы выделялись
  null,                                                  // 0 — нет
  { glyph: 'r', color: 0xffffff, name: 'заяц' },         // 1 — заяц, белый
  { glyph: 'd', color: 0xffc05a, name: 'олень' },        // 2 — олень, золотистый
  { glyph: 'f', color: 0xff6a1a, name: 'лиса' },         // 3 — лиса, оранжевая
  { glyph: '☺', color: 0x4de1ff, name: 'NPC' },          // 4 — NPC, голубой
];                                                       // конец списка

// Расставить деревья и камни. Возвращает список по 1 байту на клетку
export function makeObjects(id, heights) {               // id — номер чанка, heights — его высоты
  const objs = new Uint8Array(CHUNK * CHUNK);            // сначала везде 0 — пусто
  for (let y = 0; y < CHUNK; y++) {                      // перебираем строки
    for (let x = 0; x < CHUNK; x++) {                    // перебираем столбцы
      const d = Math.min(x, y, CHUNK - 1 - x, CHUNK - 1 - y);   // расстояние до ближайшего края
      if (d < 2) continue;                               // у самого края пусто: там проход в соседние чанки
      const h = heights[y * CHUNK + x];                  // высота клетки
      const r = hash(x, y, id + 1000) % 100;             // постоянное «случайное» число 0..99 для этой клетки
      if (h > SEA + 1 && h <= SEA + 5) {                 // трава
        if (r < 8) objs[y * CHUNK + x] = TREE;           // 8% клеток — деревья
      } else if (h > SEA + 5 && h <= SEA + 8) {          // камень
        if (r < 4) objs[y * CHUNK + x] = ROCK;           // 4% клеток — валуны
      }                                                  // конец if/else
    }                                                    // конец цикла по x
  }                                                      // конец цикла по y
  return objs;                                           // отдаём готовый список
}                                                        // конец makeObjects

// Расставить зверей и NPC. Возвращает список объектов {x, y, kind}
export function makeMobs(id, heights, objs) {            // objs нужен, чтобы не ставить существо на дерево
  const mobs = [];                                       // пока никого
  for (let k = 0; k < 60 && mobs.length < 12; k++) {     // до 60 попыток, нужно всего 12 существ
    const x = hash(id, k, 11) % CHUNK;                   // «случайный» x
    const y = hash(id, k, 12) % CHUNK;                   // «случайный» y
    const i = y * CHUNK + x;                             // номер клетки в списке
    const d = Math.min(x, y, CHUNK - 1 - x, CHUNK - 1 - y);   // расстояние до края
    if (d < 2 || heights[i] <= SEA + 1 || objs[i] !== 0) continue;   // край, вода, песок или предмет — не подходит
    if (mobs.some((m) => m.x === x && m.y === y)) continue;          // клетка уже занята другим существом
    const kind = mobs.length < 9 ? 1 + hash(id, k, 13) % 3 : 4;      // первые 9 — звери (виды 1..3), последние 3 — NPC
    mobs.push({ x, y, kind });                           // добавляем существо
  }                                                      // конец цикла
  return mobs;                                           // отдаём список
}                                                        // конец makeMobs
