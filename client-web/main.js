import { Screen } from '../client-core/screen.js';
import { viewSize, resume, tryMove, renderGame, snapshot } from '../client-core/game.js';
import { onMessage, renderOnline } from '../client-core/online.js';
import { MOVES, ALIAS } from '../client-core/controls.js';
import { menu, renderMenu, menuKey } from '../client-core/menu.js';
import { encode, decode } from '../client-core/save.js';
import { CanvasRenderer } from './canvas-renderer.js';

const SAVE_KEY = 'ascii-save';
const canvas = document.getElementById('game');
const renderer = new CanvasRenderer(canvas);
let screen;
let mode = 'menu';                                       // 'menu' | 'single' | 'online'
let ws = null;

function setup() {
  const { cols, rows } = viewSize();
  renderer.fit(cols, rows);
  screen = new Screen(cols, rows);
}

function render() {
  if (mode === 'menu') renderMenu(screen);
  else if (mode === 'single') renderGame(screen);
  else renderOnline(screen);
  renderer.draw(screen);
}

// ---------- сохранение ----------
function saveNow() {
  if (mode !== 'single') return;
  try { localStorage.setItem(SAVE_KEY, encode(snapshot())); } catch {}
}

// ---------- офлайн-кеш ----------
function prepareOffline() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// ---------- режимы ----------
function startSingle() {
  prepareOffline();                                      // при первом выборе кладём игру в кеш
  let s = null;
  try { s = decode(localStorage.getItem(SAVE_KEY)); } catch {}
  resume(s);
  mode = 'single';
}

function startOnline() {
  if (!navigator.onLine) { menu.note = 'Нет сети — доступна только одиночная игра'; return; }
  const name = prompt('Как тебя зовут?') || 'Путник';
  const sock = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  ws = sock;
  mode = 'online';
  sock.addEventListener('open', () => sock.send(JSON.stringify({ t: 'hello', name })));
  sock.addEventListener('message', (e) => { onMessage(JSON.parse(e.data)); render(); });
  sock.addEventListener('close', () => {
    if (ws !== sock) return;
    ws = null; mode = 'menu'; menu.note = 'Соединение потеряно';
    render();
  });
}

function backToMenu() {
  saveNow();
  if (ws) { const s = ws; ws = null; s.close(); }
  mode = 'menu';
}

window.addEventListener('keydown', (e) => {
  let k = e.key.toLowerCase();
  k = ALIAS[k] || k;

  if (mode === 'menu') {
    e.preventDefault();
    const m = menuKey(k);
    if (m === 'single') startSingle();
    else if (m === 'online') startOnline();
    render();
    return;
  }
  if (k === 'escape') { backToMenu(); render(); return; }

  const m = MOVES.find((m) => m.key === k);
  if (!m) return;
  e.preventDefault();
  if (mode === 'single') { tryMove(m.dx, m.dy); saveNow(); render(); }
  else if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'move', dx: m.dx, dy: m.dy }));
});

window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
window.addEventListener('resize', () => { setup(); render(); });

setup();
render();
