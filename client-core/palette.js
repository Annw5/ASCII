import { SEA } from '../shared/terrain.js';

// Хеш: из трёх чисел делает «случайное», но всегда одинаковое число.
// Нужен, чтобы символы на поверхности были разными, но не мерцали при перерисовке
export function hash(a, b, c) {
  let n = Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;   // >>> 0 делает число неотрицательным
}

// Цвет верхней грани по высоте
export function topColor(h) {
  if (h <= SEA)      return 0x2a6fd6; // вода
  if (h === SEA + 1) return 0xe0c878; // песок
  if (h <= SEA + 5)  return 0x3fa34d; // трава
  if (h <= SEA + 8)  return 0x8a8a8a; // камень
  return 0xf2f2f2;                    // снег
}

// Наборы символов для верхней грани. Из набора выбирается один по хешу
const GLYPHS = {
  water: ['~', '~', '-'],
  sand:  ['.', ':', ','],
  grass: ['"', ',', "'", '`', ';'],
  stone: ['^', 'n', '^', 'A'],
  snow:  ['*', '+', '.', '*'],
};

// Какой символ рисовать на верхней грани. r — случайное число из hash
export function topGlyph(h, r) {
  let set;
  if (h <= SEA)           set = GLYPHS.water;
  else if (h === SEA + 1) set = GLYPHS.sand;
  else if (h <= SEA + 5)  set = GLYPHS.grass;
  else if (h <= SEA + 8)  set = GLYPHS.stone;
  else                    set = GLYPHS.snow;
  return set[r % set.length];   // % — остаток от деления, даёт номер в наборе
}

// Цвет боковой стенки. depth — на сколько клеток ниже верхней грани мы смотрим.
// Сверху слой земли, глубже — камень, чем глубже, тем темнее
export function wallColor(h, depth) {
  if (h <= SEA) return shade(0x2a6fd6, Math.max(0.35, 0.9 - depth * 0.1));
  let base = depth < 2 ? 0x8b5a2b : 0x7a7a7a;          // земля или камень
  if (h === SEA + 1 && depth < 2) base = 0xc8aa60;     // под песком — песок
  return shade(base, Math.max(0.4, 1 - depth * 0.05));
}

// Умножить яркость цвета на k (k < 1 темнее, k > 1 светлее)
export function shade(c, k) {
  const r = Math.min(255, ((c >> 16) & 255) * k);
  const g = Math.min(255, ((c >> 8) & 255) * k);
  const b = Math.min(255, (c & 255) * k);
  return ((r | 0) << 16) | ((g | 0) << 8) | (b | 0);
}
