import { heightAt, SEA } from './terrain.js';           // высота мира и уровень моря

export const CHUNK = 12;                                 // сторона чанка в клетках
const EDGE = SEA + 3;                                    // высота на самом краю чанка (всегда суша)
const BORDER = 3;                                        // за сколько клеток от края начинаем выравнивать

export function makeChunk(ox, oy) {                      // создать чанк; ox, oy — его место в большом мире
  const heights = new Uint8Array(CHUNK * CHUNK);         // список высот, по 1 байту на клетку
  for (let y = 0; y < CHUNK; y++) {                      // перебираем строки
    for (let x = 0; x < CHUNK; x++) {                    // перебираем столбцы
      let h = heightAt(ox + x, oy + y);                  // «настоящая» высота из формулы мира
      const d = Math.min(x, y, CHUNK - 1 - x, CHUNK - 1 - y);   // расстояние до ближайшего края (0 — на краю)
      if (d < BORDER) {                                  // клетка близко к краю?
        const w = d / BORDER;                            // доля «настоящей» высоты: 0 на краю, почти 1 дальше
        h = Math.round(EDGE * (1 - w) + h * w);          // смешиваем: у края получается ровно EDGE
      }                                                  // конец if
      heights[y * CHUNK + x] = h;                        // записываем: номер = строка * ширина + столбец
    }                                                    // конец цикла по x
  }                                                      // конец цикла по y
  return heights;                                        // отдаём готовый список высот
}                                                        // конец функции
