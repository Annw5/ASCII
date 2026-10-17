import { heightAt } from './terrain.js';

// Сторона чанка в клетках. Пока 12, чтобы куб помещался на экран. Потом сделаем 32
export const CHUNK = 12;

// Чанк — это просто список высот: CHUNK * CHUNK чисел.
// ox, oy — где в большом мире лежит левый верхний угол чанка
export function makeChunk(ox, oy) {
  // Uint8Array — список маленьких чисел (0..255), по 1 байту на клетку
  const heights = new Uint8Array(CHUNK * CHUNK);
  for (let y = 0; y < CHUNK; y++) {
    for (let x = 0; x < CHUNK; x++) {
      // Номер клетки в списке = строка * ширина + столбец
      heights[y * CHUNK + x] = heightAt(ox + x, oy + y);
    }
  }
  return heights;
}
