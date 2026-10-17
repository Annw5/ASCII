import { Screen } from '../client-core/screen.js';
import { player, spawn, tryMove, renderGame } from '../client-core/game.js';
import { CanvasRenderer } from './canvas-renderer.js';

// Находим на странице холст по его id
const canvas = document.getElementById('game');
const renderer = new CanvasRenderer(canvas);

let screen;   // создадим в setup()

// Подготовка: подогнать холст под окно и создать экран-буфер нужного размера
function setup() {
  const { cols, rows } = renderer.resize();
  screen = new Screen(cols, rows);
}

function render() {
  renderGame(screen);     // игра рисует в буфер
  renderer.draw(screen);  // рендерер переносит буфер на холст
}

// Клавиатура: keydown срабатывает при нажатии любой клавиши; e.key — какая именно
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'arrowup')    tryMove(0, -1);
  else if (k === 'a' || k === 'arrowleft')  tryMove(-1, 0);
  else if (k === 's' || k === 'arrowdown')  tryMove(0, 1);
  else if (k === 'd' || k === 'arrowright') tryMove(1, 0);
  else return;            // другая клавиша — ничего не делаем
  e.preventDefault();     // чтобы стрелки не прокручивали страницу
  render();
});

// Окно изменило размер — пересоздаём всё
window.addEventListener('resize', () => {
  setup();
  render();
});

spawn();    // поставить игрока на сушу
setup();
render();
