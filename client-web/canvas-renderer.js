export class CanvasRenderer {                            // класс: рисует Screen на холсте
  constructor(canvas) {                                  // запускается при создании
    this.canvas = canvas;                                // запоминаем холст
    this.ctx = canvas.getContext('2d');                  // ctx — «кисть» для рисования
    this.cw = 10;                                        // ширина клетки в пикселях (потом пересчитаем)
    this.ch = 20;                                        // высота клетки в пикселях
  }                                                      // конец constructor

  fit(cols, rows) {                                      // подобрать размер символа, чтобы cols x rows влезло в окно
    const byHeight = window.innerHeight / rows;          // какая высота клетки подходит по высоте окна
    const byWidth = (window.innerWidth / cols) * 2;      // какая подходит по ширине (клетка вдвое выше, чем шире)
    let ch = Math.floor(Math.min(byHeight, byWidth));    // берём меньшую, чтобы влезло и там и там
    ch = Math.max(8, ch - (ch % 2));                     // не меньше 8 и чётное, чтобы половина была целой
    this.ch = ch;                                        // запоминаем высоту клетки
    this.cw = ch / 2;                                    // ширина клетки — ровно половина высоты

    const w = cols * this.cw;                            // ширина всей картинки в пикселях
    const h = rows * this.ch;                            // высота всей картинки в пикселях
    const dpr = window.devicePixelRatio || 1;            // плотность пикселей экрана (на «ретине» больше 1)
    this.canvas.width = w * dpr;                         // реальный размер холста
    this.canvas.height = h * dpr;                        // реальная высота холста
    this.canvas.style.width = w + 'px';                  // размер на странице
    this.canvas.style.height = h + 'px';                 // высота на странице
    this.canvas.style.marginLeft = Math.floor((window.innerWidth - w) / 2) + 'px';   // отступ слева — центрируем по ширине
    this.canvas.style.marginTop = Math.floor((window.innerHeight - h) / 2) + 'px';   // отступ сверху — центрируем по высоте

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);         // масштаб кисти под dpr (после смены размера он сбрасывается)
    this.ctx.font = `${Math.floor(this.ch * 0.8)}px monospace`;   // шрифт: 80% от высоты клетки
    this.ctx.textAlign = 'center';                       // текст по центру клетки по горизонтали
    this.ctx.textBaseline = 'middle';                    // и по вертикали
  }                                                      // конец fit

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
