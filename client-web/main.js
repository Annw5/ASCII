import { Screen } from '../client-core/screen.js';       // экран-буфер
import { spawn, tryMove, renderGame, viewSize } from '../client-core/game.js';   // функции игры
import { CanvasRenderer } from './canvas-renderer.js';   // рисовалка на холсте

const canvas = document.getElementById('game');          // находим холст по id
const renderer = new CanvasRenderer(canvas);             // создаём рисовалку

let screen;                                              // экран-буфер; создадим в setup()

const KEYS = {                                           // таблица: клавиша -> шаг [dx, dy]
  w: [-1, -1], arrowup:    [-1, -1],                     // ровно вверх по экрану
  s: [1, 1],   arrowdown:  [1, 1],                       // ровно вниз
  a: [-1, 1],  arrowleft:  [-1, 1],                      // влево
  d: [1, -1],  arrowright: [1, -1],                      // вправо
  q: [-1, 0], e: [0, -1], z: [0, 1], c: [1, 0],          // четыре «полушага» по диагоналям
};                                                       // конец таблицы

function setup() {                                       // подготовка под размер окна
  const { cols, rows } = viewSize();                     // сколько клеток нужно чанку
  renderer.fit(cols, rows);                              // подбираем размер символа
  screen = new Screen(cols, rows);                       // создаём экран-буфер
}                                                        // конец setup

function render() {                                      // один кадр
  renderGame(screen);                                    // игра рисует в буфер
  renderer.draw(screen);                                 // буфер переносится на холст
}                                                        // конец render

window.addEventListener('keydown', (e) => {              // нажатие клавиши
  const step = KEYS[e.key.toLowerCase()];                // ищем клавишу в таблице; не нашли — undefined
  if (!step) return;                                     // чужая клавиша — выходим
  e.preventDefault();                                    // стрелки не должны прокручивать страницу
  tryMove(step[0], step[1]);                             // шаг: step[0] — dx, step[1] — dy
  render();                                              // перерисовываем
});                                                      // конец обработчика

window.addEventListener('resize', () => {                // окно изменило размер
  setup();                                               // пересчитываем размеры
  render();                                              // рисуем заново
});                                                      // конец обработчика

spawn();                                                 // выбираем чанк и ставим игрока на сушу
setup();                                                 // подгоняем холст под окно
render();                                                // первый кадр
