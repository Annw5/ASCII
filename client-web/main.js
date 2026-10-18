import { Screen } from '../client-core/screen.js';       // экран-буфер
import { spawn, tryMove, renderGame, viewSize } from '../client-core/game.js';   // функции игры
import { CanvasRenderer } from './canvas-renderer.js';   // рисовалка на холсте

const canvas = document.getElementById('game');          // находим холст по id
const renderer = new CanvasRenderer(canvas);             // создаём рисовалку

let screen;                                              // экран-буфер; создадим в setup()

import { MOVES, ALIAS } from '../client-core/controls.js';   // шаги и стрелки

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
  let k = e.key.toLowerCase();                           // какая клавиша, маленькими буквами
  k = ALIAS[k] || k;                                     // если это стрелка — заменяем на букву, иначе оставляем как есть
  const m = MOVES.find((m) => m.key === k);              // ищем в списке шаг с такой клавишей
  if (!m) return;                                        // не нашли — чужая клавиша, выходим
  e.preventDefault();                                    // стрелки не должны прокручивать страницу
  tryMove(m.dx, m.dy);                                   // шагаем
  render();                                              // перерисовываем кадр
});                                                      // конец обработчика

window.addEventListener('resize', () => {                // окно изменило размер
  setup();                                               // пересчитываем размеры
  render();                                              // рисуем заново
});                                                      // конец обработчика

spawn();                                                 // выбираем чанк и ставим игрока на сушу
setup();                                                 // подгоняем холст под окно
render();                                                // первый кадр
