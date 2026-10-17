export class Screen {
  constructor(w,h) {
    this.w = w;
    this.h = h;
    const n = w*h;  // Типизированные массивы: 1 клетка = 2 + 4 + 4 байтa
  this.ch = new Uint16Array(n).fill(32); //код символа
  this.fg = new Uint32Array(n);  //цвет символа 0хRRGGBB
  this.bg = new Uint32Array(n);  //цвет фона
  // Предыдущий кадр, чтобы выводить только разницу
  this.pch = new Uint16Array(n);  //0="обязательно перерисовать"
  this.pfg = new Uint32Array(n);
  this.pbg = new Uint32Array(n);
  }
  put(x, y, char, fg=0xffffff, bg=0x000000) {
    if (x < 0 || y < 0 || x>= this.w || y >= this.h) return;
    const i = y * this.w + x;
    this.ch[i] = char.codePointAt(0);
    this.fg[i] = fg;
    this.bg[i] = bg;
  }
}
      // Залить весь экран «пустотой»
  clear(bg = 0x05060a) {
    this.ch.fill(32);
    this.fg.fill(0);
    this.bg.fill(bg);
  }

  // Вывести строку
  text(x, y, str, fg = 0xffffff, bg = 0x000000) {
    for (const c of str) this.put(x++, y, c, fg, bg);
  }
  }

//Строка ANSI-команд, которая превращает прошлый кадр в текущий

diff() {
  let out = '';
  let last = -2, lastFg = -1, lastBg = -1;

  for (let i = 0; i < this.ch.length; i++) {
      if (this.ch[i] === this.pch[i] &&
          this.fg[i] === this.pfg[i] &&
          this.bg[i] === this.pbg[i]) continue;

  this.pch[i] = this.ch[i];
  this.pfg[i] = this.fg[i];
  this.pbg[i] = this.bg[i];

  // Двигаем курсор, только если клетка не следует сразу за предыдущей
   if (i !== last + 1 || i % this.w === 0) {
        out += `\x1b[${Math.floor(i / this.w) + 1};${(i % this.w) + 1}H`;
      }
      if (this.fg[i] !== lastFg) {
        const c = this.fg[i];
        out += `\x1b[38;2;${c >> 16};${(c >> 8) & 255};${c & 255}m`;
        lastFg = c;
      }
      if (this.bg[i] !== lastBg) {
        const c = this.bg[i];
        out += `\x1b[48;2;${c >> 16};${(c >> 8) & 255};${c & 255}m`;
        lastBg = c;
      }
      out += String.fromCodePoint(this.ch[i]);
      last = i;
    }
    return out;
  }
}
