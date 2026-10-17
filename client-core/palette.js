import { SEA } from '../shared/terrain.js';

// Цвет верхней грани по высоте
export function topColor(h) {
  if (h <= SEA)     return 0x2a6fd6; // вода
  if (h === SEA + 1) return 0xe0c878; // песок
  if (h <= SEA + 5) return 0x3fa34d; // трава
  if (h <= SEA + 8) return 0x8a8a8a; // камень
  return 0xf2f2f2;                   // снег
}

// Умножить яркость цвета на k (k < 1 темнее, k > 1 светлее)
export function shade(c, k) {
  const r = Math.min(255, ((c >> 16) & 255) * k);
  const g = Math.min(255, ((c >> 8) & 255) * k);
  const b = Math.min(255, (c & 255) * k);
  return ((r | 0) << 16) | ((g | 0) << 8) | (b | 0);
}
