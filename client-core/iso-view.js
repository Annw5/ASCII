import { MOVES } from './controls.js';                   // список возможных шагов
import { SEA, MAXH } from '../shared/terrain.js';              // уровень моря
import { CHUNK } from '../shared/chunk.js';              // размер чанка
import { topColor, shade, wallColor, topGlyph, hash } from './palette.js';   // цвета, символы, «случайность»

const LEFT  = ['%', '&', '8'];                           // символы левой стенки
const RIGHT = ['#', 'H', 'M'];                           // символы правой стенки

function hAt(chunk, x, y) {                              // высота клетки для расчёта стенок
  if (x < 0 || y < 0 || x >= CHUNK || y >= CHUNK) return 0;   // за краем чанка высота 0
  const v = chunk[y * CHUNK + x];                        // берём высоту из списка
  return v > SEA ? v : SEA;                              // вода считается на уровне моря
}                                                        // конец hAt
export function drawIso(screen, chunk, player) {
 
  const maxH = MAXH;                                     // одна высота для всех чанков, чтобы рисунок не прыгал
  const H2 = (maxH + 1) >> 1;                            // высота в строках: 1 уровень = полстроки
  const total = H2 + CHUNK;
  const baseRow = ((screen.h - total) >> 1) + H2;
  const cx = screen.w >> 1;

  let pCol = -1, pRow = -1;

  for (let s = 0; s <= CHUNK * 2 - 2; s++) {
    const from = Math.max(0, s - (CHUNK - 1));
    const to = Math.min(CHUNK - 1, s);
    for (let x = from; x <= to; x++) {
      const y = s - x;
      const raw = chunk[y * CHUNK + x];
      const h = raw > SEA ? raw : SEA;

      const col  = cx + x - y;
      const gRow = baseRow + (s >> 1);                   // строка «земли» под клеткой
      const top  = baseRow + ((s - h) >> 1);             // верхушка: ОДНО округление

      const g = hash(x, y, 1);
      const bright = 0.85 + ((g >>> 8) % 4) * 0.1;
      screen.put(col, top, topGlyph(raw, g), shade(topColor(raw), bright), 0);

      const hRight = hAt(chunk, x + 1, y);

      for (let r = top + 1; r <= gRow; r++) {            // стенка: от верхушки до земли
        const i   = r - top - 1;                         // номер строки стенки
        const lvl = i * 2;                               // глубина в уровнях высоты
        const z   = h - 1 - lvl;
        const wc  = wallColor(raw, lvl);
        const gw  = hash(x, y, i + 2);
        if (z >= hRight) screen.put(col, r, RIGHT[gw % RIGHT.length], shade(wc, 0.55), 0);
        else             screen.put(col, r, LEFT[gw % LEFT.length],  shade(wc, 0.85), 0);
      }

      if (x === player.x && y === player.y) {
        pCol = col;
        pRow = top - 1;                                  // ровно над символом своей клетки
      }
    }
  }
  const here = chunk[player.y * CHUNK + player.x];       // высота клетки, на которой стоит игрок
  for (const m of MOVES) {                               // перебираем все 8 возможных шагов
    const nx = player.x + m.dx;                          // x клетки, куда попадём
    const ny = player.y + m.dy;                          // y клетки, куда попадём
    if (nx < 0 || ny < 0 || nx >= CHUNK || ny >= CHUNK) continue;   // клетка за краем чанка — подсказку не рисуем
    const raw = chunk[ny * CHUNK + nx];                  // настоящая высота той клетки
    const h = raw > SEA ? raw : SEA;                     // высота для рисования (воду считаем уровнем моря)
    const ok = raw > SEA && Math.abs(raw - here) <= 1;   // можно ли туда шагнуть: не вода и перепад не больше 1
    const col = cx + nx - ny;                            // колонка той клетки — формула та же, что при рисовании мира
    const top = baseRow + ((nx + ny - h) >> 1);         // строка верхушки той клетки — тоже та же формула
    screen.put(col, top - 1, m.key.toUpperCase(), ok ? 0x6dff6d : 0x803030, 0);   // буква над клеткой: зелёная или тёмно-красная
  }                                                      // конец цикла по шагам
  if (pCol >= 0) screen.put(pCol, pRow, '@', 0xffe14d, 0);
}
