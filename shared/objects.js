import { SEA } from './terrain.js';                      // уровень моря
import { CHUNK } from './chunk.js';                      // размер чанка
import { hash } from './hash.js';                        // «случайность» без Math.random

export const TREE = 1, ROCK = 2;                         // номера неподвижных предметов (0 — пусто)

export const OBJ_KINDS = [                               // как рисовать предмет: номер в списке = номер вида
  null,                                                  // 0 — пусто, рисовать нечего
  { glyph: '♣', color: 0x1f7a2f },                       // 1 — дерево: тёмно-зелёное, темнее травы
  { glyph: 'o',  color: 0xb0b0b0 },                      // 2 — камень: светло-серый
];                                                       // конец списка

const BEAST_LIST = [                                     // одна буква алфавита = один вид
  ['антилопа',  0xe8c87a],
  ['барсук',    0xd8d8a0],
  ['волк',      0x9aa5c0],
  ['глухарь',   0x7fd1a0],
  ['дикобраз',  0xc9a0ff],
  ['енот',      0xa8a8b8],
  ['ёж',        0xb08060],
  ['журавль',   0xf0f0ff],
  ['заяц',      0xffffff],
  ['ирбис',     0xcfe3ff],
  ['косуля',    0xffc05a],
  ['лиса',      0xff6a1a],
  ['медведь',   0xc97b3a],
  ['нутрия',    0x8fd0c0],
  ['олень',     0xffa040],
  ['песец',     0xe0f0ff],
  ['рысь',      0xd0b060],
  ['сова',      0xe0a0e0],
  ['тигр',      0xffd02a],
  ['утка',      0x40d0a0],
  ['фазан',     0xff8080],
  ['хорёк',     0xe0c0a0],
  ['цапля',     0xb0c0ff],
  ['чайка',     0xffffff],
  ['шакал',     0xd09040],
  ['щегол',     0xff5050],
  ['эму',       0xa0905a],
  ['юрок',      0x90e060],
  ['ящерица',   0x60ff90],
];                                                       // конец списка зверей

export const BEASTS = BEAST_LIST.length;                 // сколько видов зверей (номера 1..BEASTS)
export const NPC = BEASTS + 1;                           // номер вида NPC

export const MOB_KINDS = [                               // номер в списке = номер вида
  null,                                                  // 0 — нет
  ...BEAST_LIST.map(([name, color]) => ({ glyph: name[0], color, name })),   // глиф = первая буква названия
  { glyph: '☺', color: 0x4de1ff, name: 'NPC' },          // последним идёт NPC
  { glyph: '@', color: 0x7dff7d, name: 'игрок' },        // другие игроки
];
export const PLAYER = NPC + 1;

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
    const kind = mobs.length < 9 ? 1 + hash(id, k, 13) % BEASTS : NPC;
    mobs.push({ x, y, kind });                           // добавляем существо
  }                                                      // конец цикла
  return mobs;                                           // отдаём список
}                                                        // конец makeMobs
