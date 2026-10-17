export class Screen {
  constructor(w,h) {
    this.w = w;
    this.h = h;
    const n = w*h;  // Типизированные массивы: 1 клетка = 2 + 4 + 4 байтa
  this.ch = new Unit16Array(n).fill(32); //код символа
  this.fg = new Unit32Array(n);  //цвет символа 0хRRGGBB
  this.bg = new Unit32Array(n);  //цвет фона
  // Предыдущий кадр, чтобы выводить только разницу
  this.pch = new Unit16Array(n);  //0="обязательно перерисовать"
  this.pfg = new Unit32Array(n);
  this.pbg = new Unit32Array(n);
  }
  put(x, y, char, fg=0xffffff, bg=0x000000) {
    if (x < 0 || y < 0 || x>= this.w || y >= this.h) return;
    const i = y * this.w + x;
    this.ch[i] = char.codePointAt(0);
    this.fg[i] = fg;
    this.bg[i] = bg;
    
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

  for (let i = 0; i < this.length; i++) {
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

client-term/main.js: вход, ввод и рисование:

js
import { Screen } from '../client-core/screen.js';

const out = process.stdout;
const player = { x: 0, y: 0 };

// Пока карта считается из координат на лету (в уроке 2 заменим на нормальный генератор)
function tileAt(x, y) {
  const h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) >>> 0;
  const r = h % 100;
  if (r < 8)  return ['♣', 0x2e9b45, 0x0e2a12];
  if (r < 11) return ['▲', 0x9a9a9a, 0x1a1a1a];
  return ['.', 0x3a7a3a, 0x0e2a12];
}

let screen = new Screen(out.columns, out.rows);

function render() {
  const cx = screen.w >> 1, cy = screen.h >> 1;
  for (let sy = 0; sy < screen.h; sy++) {
    for (let sx = 0; sx < screen.w; sx++) {
      const [c, fg, bg] = tileAt(player.x + sx - cx, player.y + sy - cy);
      screen.put(sx, sy, c, fg, bg);
    }
  }
  screen.put(cx, cy, '@', 0xffe14d, 0x0e2a12);
  out.write(screen.diff());
}

// Подготовка терминала: альтернативный экран и скрытый курсор
out.write('\x1b[?1049h\x1b[?25l');

function quit() {
  out.write('\x1b[0m\x1b[?25h\x1b[?1049l'); // вернуть всё как было
  process.exit();
}

process.stdin.setRawMode(true);   // получаем каждую клавишу сразу, без Enter
process.stdin.resume();
process.stdin.on('data', (key) => {
  const k = key.toString();
  if (k === 'q' || k === '\x03') quit();               // q или Ctrl+C
  if (k === 'w' || k === '\x1b[A') player.y--;
  if (k === 's' || k === '\x1b[B') player.y++;
  if (k === 'a' || k === '\x1b[D') player.x--;
  if (k === 'd' || k === '\x1b[C') player.x++;
  render();                                            // рисуем только по событию
});

out.on('resize', () => {
  screen = new Screen(out.columns, out.rows);
  render();
});

render();
