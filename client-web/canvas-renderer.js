export class CanvasRenderer {
  constructor(canvas, stage) {
    this.canvas = canvas;
    this.stage = stage;                                  // область, в которую вписываем игру
    this.ctx = canvas.getContext('2d');
    this.cw = 10;
    this.ch = 20;
  }

  fit(cols, rows) {
    const availW = this.stage.clientWidth || window.innerWidth;
    const availH = this.stage.clientHeight || window.innerHeight;
    const byHeight = availH / rows;
    const byWidth = (availW / cols) * 2;
    let ch = Math.floor(Math.min(byHeight, byWidth));
    ch = Math.max(8, ch - (ch % 2));
    this.ch = ch;
    this.cw = ch / 2;

    const w = cols * this.cw;
    const h = rows * this.ch;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.font = `${Math.floor(this.ch * 0.8)}px monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
  }

  draw(screen) {                                         // нарисовать экран-буфер на холсте
    const ctx = this.ctx;                                // короткое имя для кисти
    const { cw, ch } = this;                             // достаём размеры клетки
    let lastBg = -1;                                     // последний цвет, выставленный кисти (-1 — никакого)

    for (const h of screen.prevHints) screen.pch[h.i] = 0;   // клетки со старыми подсказками перерисуем целиком, чтобы стереть буквы
    for (const h of screen.hints) screen.pch[h.i] = 0;       // клетки с новыми тоже: иначе буква наложится сама на себя
    for (let i = 0; i < screen.ch.length; i++) {         // перебираем все клетки экрана
      if (screen.ch[i] === screen.pch[i] &&              // символ такой же, как в прошлом кадре
          screen.fg[i] === screen.pfg[i] &&              // и цвет символа такой же
          screen.bg[i] === screen.pbg[i]) continue;      // и фон такой же — пропускаем клетку

      screen.pch[i] = screen.ch[i];                      // запоминаем символ как «прошлый кадр»
      screen.pfg[i] = screen.fg[i];                      // запоминаем цвет символа
      screen.pbg[i] = screen.bg[i];                      // запоминаем цвет фона

      const x = (i % screen.w) * cw;                     // пиксель слева: номер столбца * ширина клетки
      const y = Math.floor(i / screen.w) * ch;           // пиксель сверху: номер строки * высота клетки

      if (screen.bg[i] !== lastBg) {                     // цвет фона отличается от того, что у кисти?
        lastBg = screen.bg[i];                           // запоминаем новый
        ctx.fillStyle = '#' + lastBg.toString(16).padStart(6, '0');   // число в запись «#rrggbb»
      }                                                  // конец if
      ctx.fillRect(x, y, cw, ch);                        // закрашиваем фон клетки (он у нас чёрный)

      if (screen.ch[i] !== 32) {                         // это не пробел?
        ctx.fillStyle = '#' + screen.fg[i].toString(16).padStart(6, '0');   // цвет символа
        lastBg = -1;                                     // кисть теперь «не того цвета» для фона — сбрасываем
        ctx.fillText(String.fromCodePoint(screen.ch[i]), x + cw / 2, y + ch / 2);   // рисуем символ по центру клетки
      }                                                  // конец if
    }                                                    // конец цикла
        ctx.font = `${Math.floor(ch * 0.5)}px monospace`;    // шрифт подсказок: 40% высоты клетки, вдвое мельче основного
    for (const h of screen.hints) {                      // рисуем подсказки поверх сетки
      const x = (h.i % screen.w) * cw;                   // пиксель слева у клетки
      const y = Math.floor(h.i / screen.w) * ch;         // пиксель сверху у клетки
      ctx.fillStyle = '#' + h.fg.toString(16).padStart(6, '0');   // цвет буквы в записи «#rrggbb»
      ctx.fillText(h.c, x + cw * 0.78, y + ch * 0.78);   // нижний правый угол клетки; 0.78 можно подвигать
    }                                                    // конец цикла по подсказкам
    ctx.font = `${Math.floor(ch * 0.8)}px monospace`;    // возвращаем обычный шрифт для следующего кадра
  }                                                      // конец draw
}                                                        // конец класса
