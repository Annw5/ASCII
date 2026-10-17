import { Screen } from '../client-core/screen.js';       // экран-буфер
import { spawn, tryMove, renderGame, viewSize } from '../client-core/game.js';   // функции игры
import { CanvasRenderer } from './canvas-renderer.js';   // рисовалка на холсте

const canvas = document.getElementById('game');          // находим холст на странице по id
const renderer = new CanvasRenderer(canvas);             // создаём рисовалку

let screen;                                              // экран-буфер; создадим в setup()

function setup() {                                       // подготовка под текущий размер окна
  const { cols, rows } = viewSize();                     // узнаём, сколько клеток нужно чанку
  renderer.fit(cols, rows);                              // подбираем размер символа, чтобы всё влезло
  screen = new Screen(cols, rows);                       // создаём экран-буфер ровно такого размера
}                                                        // конец setup

function render() {                                      // один кадр
  renderGame(screen);                                    // игра рисует в буфер
  renderer.draw(screen);                                 // рисовалка переносит буфер на холст
}                                                        // конец render

window.addEventListener('keydown', (e) => {              // при нажатии любой клавиши
  const k = e.key.toLowerCase();                         // какая клавиша, в нижнем регистре
  if (k === 'w' || k === 'arrowup')         tryMove(0, -1);    // вверх
  else if (k === 'a' || k === 'arrowleft')  tryMove(-1, 0);    // влево
  else if (k === 's' || k === 'arrowdown')  tryMove(0, 1);     // вниз
  else if (k === 'd' || k === 'arrowright') tryMove(1, 0);     // вправо
  else return;                                           // другая клавиша — выходим, ничего не делаем
  e.preventDefault();                                    // запрещаем стрелкам прокручивать страницу
  render();                                              // перерисовываем кадр
});                                                      // конец обработчика клавиш

window.addEventListener('resize', () => {                // если окно изменило размер
  setup();                                               // пересчитываем размер символа и экран
  render();                                              // и рисуем заново
});                                                      // конец обработчика

spawn();                                                 // ставим игрока на сушу
setup();                                                 // подгоняем холст под окно
render();                                                // рисуем первый кадр
