import { heightAt, SEA, MAXH } from '../shared/terrain.js';
import { topColor, shade } from './palette.js';

// Один блок: верхняя грань 4x2 клетки + две стены вниз до нулевого уровня
function drawBlock(screen, sx, top, h, raw) {
  const c = topColor(raw);
  const ch = raw <= SEA ? '~' : '.';
  const fg = shade(c, 1.2);

  for (let r = 0; r < 2; r++)
    for (let k = 0; k < 4; k++)
      screen.put(sx + k, top + r, ch, fg, c);

  const left = shade(c, 0.7);
  const right = shade(c, 0.5);
  for (let i = 0; i < h; i++) {
    const row = top + 2 + i;
    screen.put(sx,     row, ' ', 0, left);
    screen.put(sx + 1, row, ' ', 0, left);
    screen.put(sx + 2, row, ' ', 0, right);
    screen.put(sx + 3, row, ' ', 0, right);
  }
}

export function drawIso(screen, player) {
  const cx = screen.w >> 1;
  const cy = screen.h >> 1;
  const hp = Math.max(heightAt(player.x, player.y), SEA); // высота под игроком
  const vMax = (screen.w >> 2) + 2;

  // s = dx + dy  (экранная строка), v = dx - dy  (экранная колонка / 2)
  // Идём по s по возрастанию: от дальних тайлов к ближним
  for (let s = -cy - MAXH - 2; s <= cy + MAXH + 2; s++) {
    let v = -vMax;
    if ((v + s) & 1) v++;               // dx и dy должны получиться целыми
    for (; v <= vMax; v += 2) {
      const dx = (s + v) >> 1;
      const dy = (s - v) >> 1;
      const raw = heightAt(player.x + dx, player.y + dy);
      const h = raw > SEA ? raw : SEA;  // вода рисуется на уровне моря
      const top = cy + s - (h - hp);    // первая строка верхней грани
      if (top >= screen.h || top + h + 1 < 0) continue; // за экраном

      drawBlock(screen, cx + v * 2 - 2, top, h, raw);
      if (dx === 0 && dy === 0) screen.put(cx, top, '@', 0xffffff, topColor(raw));
    }
  }
}
