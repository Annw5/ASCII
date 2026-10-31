import { Screen } from '../client-core/screen.js';
import { viewSize, resume, tryMove, renderGame, snapshot } from '../client-core/game.js';
import { onMessage, renderOnline } from '../client-core/online.js';
import { MOVES, ALIAS } from '../client-core/controls.js';
import { menu, renderMenu, menuKey } from '../client-core/menu.js';
import { encode, decode } from '../client-core/save.js';
import { CanvasRenderer } from './canvas-renderer.js';

const SAVE_KEY = 'ascii-save';
const canvas = document.getElementById('game');
const stage = document.getElementById('stage');
const menuBtn = document.getElementById('menuBtn');
const renderer = new CanvasRenderer(canvas, stage);
let screen;
let mode = 'menu';                                       // 'menu' | 'single' | 'online'
let ws = null;

// сенсорный интерфейс: на телефонах/планшетах, либо вручную через ?touch
if (matchMedia('(pointer: coarse)').matches || /[?&]touch\b/.test(location.search)) {
  document.body.classList.add('touch');
}

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
  menuBtn.textContent = mode === 'menu' ? 'OK' : '☰';   // центральная кнопка: Enter в меню, Esc в игре
}

// ---------- сохранение ----------
function saveNow() {
  if (mode !== 'single') return;
  try { localStorage.setItem(SAVE_KEY, encode(snapshot())); } catch {}
}

// ---------- офлайн-кеш ----------
function prepareOffline() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ---------- режимы ----------
function startSingle() {
  prepareOffline();
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

// ---------- единая обработка нажатий (клавиатура и экранные кнопки) ----------
// k — нормализованная клавиша: 'w', 'enter', 'escape', ... Возвращает true, если нажатие обработано
function handleKey(k) {
  if (mode === 'menu') {
    const m = menuKey(k);
    if (m === 'single') startSingle();
    else if (m === 'online') startOnline();
    render();
    return true;
  }
  if (k === 'escape') { backToMenu(); render(); return true; }

  const m = MOVES.find((m) => m.key === k);
  if (!m) return false;
  if (mode === 'single') { tryMove(m.dx, m.dy); saveNow(); render(); }
  else if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'move', dx: m.dx, dy: m.dy }));
  return true;
}

window.addEventListener('keydown', (e) => {
  let k = e.key.toLowerCase();
  k = ALIAS[k] || k;
  const wasMenu = mode === 'menu';
  const handled = handleKey(k);
  if (wasMenu || handled) e.preventDefault();
});

// ---------- экранные кнопки ----------
const REPEAT_MS = 160;                                   // как часто шагать, пока кнопку держат

function keyOf(btn) {
  const k = btn.dataset.key;
  return k === 'menu' ? (mode === 'menu' ? 'enter' : 'escape') : k;
}

for (const btn of document.querySelectorAll('.btn')) {
  let timer = 0;
  const stop = () => { clearInterval(timer); timer = 0; btn.classList.remove('on'); };

  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    btn.setPointerCapture(e.pointerId);                  // pointerup придёт, даже если палец съехал с кнопки
    btn.classList.add('on');
    handleKey(keyOf(btn));
    if (btn.dataset.key !== 'menu' && mode !== 'menu') {
      timer = setInterval(() => {
        if (mode === 'menu') return stop();              // например, пропало соединение
        handleKey(keyOf(btn));
      }, REPEAT_MS);
    }
  });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(t, stop);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

// следим за размером области игры: поворот телефона, адресная строка, смена окна
new ResizeObserver(() => { setup(); render(); }).observe(stage);

setup();
render();
