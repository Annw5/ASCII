export class CanvasRenderer {
  // canvas — элемент <canvas> со страницы
  // cw, ch — размер одной клетки в пикселях (высота вдвое больше ширины, как в терминале)
  constructor(canvas, cw = 10, ch = 20) {
    this.canvas = canvas;
    this.cw = cw;
    this.ch = ch;
    // ctx — «кисть»: через неё рисуют на холсте
    this.ctx = canvas.getContext('2d');
    this.cols = 0;
    this.rows = 0;
  }

  // Подогнать холст под размер окна. Возвращает, сколько клеток поместилось
  resize() {
    // Сколько целых клеток влезает в окно браузера
    this.cols = Math.floor(window.innerWidth / this.cw);
    this.rows = Math.floor(window.innerHeight / this.ch);

    // На «ретина»-экранах один CSS-пиксель = несколько физических.
    // Учитываем это, иначе буквы будут размытыми
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.cols * this.cw * dpr;    // реальный размер холста
    this.canvas.height = this.rows * this.ch * dpr;
    this.canvas.style.width = this.cols * this.cw + 'px';   // размер на странице
    this.canvas.style.height = this.rows * this.ch + 'px';

    // Любое изменение размера холста сбрасывает настройки кисти, задаём их заново
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);       // масштаб под dpr
    this.ctx.font = `${Math.floor(this.ch * 0.8)}px monospace`;
    this.ctx.textAlign = 'center';                      // текст по центру клетки
    this.ctx.textBaseline = 'middle';
    return { cols: this.cols, rows: this.rows };
  }

  // Нарисовать экран-буфер. Как и в diff(), трогаем только изменившиеся клетки
  draw(screen) {
    const ctx = this.ctx;
    const { cw, ch } = this;
    let lastBg = -1, lastFg = -1;   // чтобы не менять цвет кисти без нужды

    for (let i = 0; i < screen.ch.length; i++) {
      if (screen.ch[i] === screen.pch[i] &&
          screen.fg[i] === screen.pfg[i] &&
          screen.bg[i] === screen.pbg[i]) continue;

      // Запоминаем клетку как «прошлый кадр»
      screen.pch[i] = screen.ch[i];
      screen.pfg[i] = screen.fg[i];
      screen.pbg[i] = screen.bg[i];

      // Из номера клетки получаем её столбец и строку, затем пиксели
      const x = (i % screen.w) * cw;
      const y = Math.floor(i / screen.w) * ch;

      // Фон: залить прямоугольник
      if (screen.bg[i] !== lastBg) {
        lastBg = screen.bg[i];
        // toString(16) — число в 16-ричную запись, padStart добивает нулями до 6 цифр
        ctx.fillStyle = '#' + lastBg.toString(16).padStart(6, '0');
      }
      ctx.fillRect(x, y, cw, ch);

      // Символ (пробелы рисовать не нужно)
      if (screen.ch[i] !== 32) {
        if (screen.fg[i] !== lastFg) {
          lastFg = screen.fg[i];
        }
        // fillStyle общий для фона и текста, поэтому ставим его заново и сбрасываем кэш фона
        ctx.fillStyle = '#' + lastFg.toString(16).padStart(6, '0');
        lastBg = -1;
        ctx.fillText(String.fromCodePoint(screen.ch[i]), x + cw / 2, y + ch / 2);
      }
    }
  }
}
