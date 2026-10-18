import { Screen } from '../client-core/screen.js';
import { viewSize } from '../client-core/game.js';
import { onMessage, renderOnline } from '../client-core/online.js';
import { MOVES, ALIAS } from '../client-core/controls.js';
import { CanvasRenderer } from './canvas-renderer.js';

const canvas = document.getElementById('game');
const renderer = new CanvasRenderer(canvas);
let screen;

function setup() {
  const { cols, rows } = viewSize();
  renderer.fit(cols, rows);
  screen = new Screen(cols, rows);
}

function render() {
  renderOnline(screen);
  renderer.draw(screen);
}

const name = prompt('Как тебя зовут?') || 'Путник';
const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', name })));
ws.addEventListener('message', (e) => { onMessage(JSON.parse(e.data)); render(); });

window.addEventListener('keydown', (e) => {
  let k = e.key.toLowerCase();
  k = ALIAS[k] || k;
  const m = MOVES.find((m) => m.key === k);
  if (!m) return;
  e.preventDefault();
  if (ws.readyState === 1) ws.send(JSON.stringify({ t: 'move', dx: m.dx, dy: m.dy }));
});

window.addEventListener('resize', () => { setup(); render(); });

setup();
render();
