import { Screen } from '../client-core/screen.js';
import { viewSize, resume, tryMove, renderGame, snapshot, tickGame } from '../client-core/game.js';
import { onMessage, renderOnline } from '../client-core/online.js';
import { MOVES, ALIAS } from '../client-core/controls.js';
import { menu, renderMenu, menuKey } from '../client-core/menu.js';
import { encode, decode } from '../client-core/save.js';
import { CanvasRenderer } from './canvas-renderer.js';
import * as saveFile from './save-file.js';
import { TICK_MS } from '../shared/constants.js';

const SAVE_KEY = 'ascii-save';
const FLAG_KEY = 'ascii-save-file';                      // включено ли «сохранение в файл»
const canvas = document.getElementById('game');
const stage = document.getElementById('stage');
const menuBtn = document.getElementById('menuBtn');
const renderer = new CanvasRenderer(canvas, stage);
let screen;
let mode = 'menu';                                       // 'menu' | 'single' | 'online'
let ws = null;
let busy = false;                                        // идёт асинхронное действие (выбор файла и т.п.)

try { menu.save = localStorage.getItem(FLAG_KEY) === '1'; } catch {}

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

function run(fn) {                                       // запустить асинхронное действие из меню
  busy = true;
  fn().catch(() => {}).finally(() => { busy = false; render(); });
}

// ---------- сохранение ----------
function saveNow() {
  if (mode !== 'single') return;
  const text = encode(snapshot());
  try { localStorage.setItem(SAVE_KEY, text); } catch {}   // кеш: всегда
  if (menu.save) saveFile.write(text);                   // файл: только если включено
}

async function toggleSave() {
  if (menu.save) {                                       // выключаем
    menu.save = false;
    try { localStorage.removeItem(FLAG_KEY); } catch {}
    return;
  }
  if (saveFile.canPick) {
    let ok = await saveFile.open(true);
    if (!ok) { await saveFile.choose(); }                // отмена выбора -> ошибка -> галочка не включится
    const text = await saveFile.read();
    if (text && decode(text)) {                          // в файле уже есть сохранение — берём его
      try { localStorage.setItem(SAVE_KEY, text); } catch {}
    } else {                                             // файл пустой — кладём в него текущий прогресс
      let cached = null;
      try { cached = localStorage.getItem(SAVE_KEY); } catch {}
      if (cached) saveFile.write(cached);
    }
  }
  menu.save = true;
  try { localStorage.setItem(FLAG_KEY, '1'); } catch {}
}

// ---------- офлайн-кеш ----------
function prepareOffline() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ---------- режимы ----------
async function startSingle() {
  prepareOffline();
  let text = null;
  try { text = localStorage.getItem(SAVE_KEY); } catch {}
  if (menu.save) {
    if (saveFile.canPick) {
      if (await saveFile.open(true)) {
        const t = await saveFile.read();
        if (t && decode(t)) text = t;                    // файл главнее кеша
      }
    } else if (!decode(text)) {                          // кеш пуст: просим указать скачанный файл
      const t = await saveFile.pickText();
      if (t && decode(t)) text = t;
    }
  }
  resume(decode(text));
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
  const wasSingle = mode === 'single';
  saveNow();
  if (wasSingle && menu.save && !saveFile.canPick) saveFile.download(encode(snapshot()));   // запасной вариант
  if (ws) { const s = ws; ws = null; s.close(); }
  mode = 'menu';
}

// ---------- единая обработка нажатий (клавиатура и экранные кнопки) ----------
function handleKey(k) {
  if (mode === 'menu') {
    const m = menuKey(k);
    if (!busy) {
      if (m === 'single') run(startSingle);
      else if (m === 'online') startOnline();
      else if (m === 'save') run(toggleSave);
    }
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

// ---------- нажатие по галочке «сохранение» (мышь и палец) ----------
canvas.addEventListener('click', (e) => {
  if (mode !== 'menu' || busy) return;
  const r = canvas.getBoundingClientRect();
  const col = Math.floor(((e.clientX - r.left) / r.width) * screen.w);
  const row = Math.floor(((e.clientY - r.top) / r.height) * screen.h);
  const hit = menu.saveHit;
  if ((row === hit.y || row === hit.y + 1) && col >= hit.x0 && col < hit.x1) run(toggleSave);
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
    btn.setPointerCapture(e.pointerId);
    btn.classList.add('on');
    handleKey(keyOf(btn));
    if (btn.dataset.key !== 'menu' && mode !== 'menu') {
      timer = setInterval(() => {
        if (mode === 'menu') return stop();
        handleKey(keyOf(btn));
      }, REPEAT_MS);
    }
  });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(t, stop);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

new ResizeObserver(() => { setup(); render(); }).observe(stage);

setup();
render();

setInterval(() => { if (mode === 'single') { tickGame(); render(); } }, TICK_MS);
