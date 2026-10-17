export function drawIso(screen, chunk, player) {
  let maxH = SEA;
  for (const v of chunk) if (v > maxH) maxH = v;

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

  if (pCol >= 0) screen.put(pCol, pRow, '@', 0xffe14d, 0);
}
