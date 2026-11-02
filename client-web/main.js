import { Screen } from '../client-core/screen.js';
import { ui, MOVES, ALIAS, menu, renderMenu, menuKey } from '../client-core/view.js';
import { viewSize, resume, tryMove, renderGame, snapshot, tickGame, encode, decode, onMessage, renderOnline } from '../client-core/game.js';
import { CanvasRenderer } from './canvas-renderer.js';
import * as saveFile from './save-file.js';
import { TICK_MS } from '../shared/world.js';

const SAVE_KEY = 'ascii-save';
const FLAG_KEY = 'ascii-save-file';
const canvas = document.getElementById('game');
const stage = document.getElementById('stage');
const menuBtn = document.getElementById('menuBtn');
const renderer = new CanvasRenderer(canvas, stage);
let screen;
let mode = 'menu';                           // 'menu' | 'single' | 'online'
let ws = null;
let busy = false;

try { menu.save = localStorage.getItem(FLAG_KEY) === '1'; } catch {}

const touch = matchMedia('(pointer: coarse)').matches || /[?&]touch\b/.test(location.search);
if (touch) document.body.classList.add('touch');

function setup() {
  const { cols, rows } = viewSize();
  const d = renderer.fit(cols, rows, ui.corners);
  screen = new Screen(d.cols, d.rows);
}

function setList(v) {                        // панель: на телефоне раскладка по углам
  ui.list = v;
  ui.corners = v && touch;
  document.body.classList.toggle('panel', ui.corners);
  setup();
}

function render() {
  if (mode === 'menu' && ui.list) setList(false);
  if (mode === 'menu') renderMenu(screen);
  else if (mode === 'single') renderGame(screen);
  else renderOnline(screen);
  renderer.draw(screen);
  menuBtn.textContent = mode === 'menu' ? 'OK' : '☰';
}

function run(fn) {
  busy = true;
  fn().catch(() => {}).finally(() => { busy = false; render(); });
}

// ---------- сохранение ----------
function saveNow() {
  if (mode !== 'single') return;
  const text = encode(snapshot());
  try { localStorage.setItem(SAVE_KEY, text); } catch {}
  if (menu.save) saveFile.write(text);
}

async function toggleSave() {
  if (menu.save) {
    menu.save = false;
    try { localStorage.removeItem(FLAG_KEY); } catch {}
    return;
  }
  if (saveFile.canPick) {
    if (!(await saveFile.open(true))) await saveFile.choose();   // отмена -> ошибка -> галочка не включится
    const text = await saveFile.read();
    if (text && decode(text)) {
      try { localStorage.setItem(SAVE_KEY, text); } catch {}
    } else {
      let cached = null;
      try { cached = localStorage.getItem(SAVE_KEY); } catch {}
      if (cached) saveFile.write(cached);
    }
  }
  menu.save = true;
  try { localStorage.setItem(FLAG_KEY, '1'); } catch {}
}

// ---------- режимы ----------
async function startSingle() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  let text = null;
  try { text = localStorage.getItem(SAVE_KEY); } catch {}
  if (menu.save) {
    if (saveFile.canPick) {
      if (await saveFile.open(true)) {
        const t = await saveFile.read();
        if (t && decode(t)) text = t;
      }
    } else if (!decode(text)) {
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
  if (wasSingle && menu.save && !saveFile.canPick) saveFile.download(encode(snapshot()));
  if (ws) { const s = ws; ws = null; s.close(); }
  mode = 'menu';
}

// ---------- нажатия (клавиатура и экранные кнопки) ----------
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
  if (k === 'escape') { if (ui.list) setList(false); else backToMenu(); render(); return true; }
  if (k === 'i') { setList(!ui.list); render(); return true; }

  const m = MOVES.find((m) => m.key === k);
  if (!m) return false;
  if (mode === 'single') { tryMove(m.dx, m.dy); saveNow(); render(); }
  else if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'move', dx: m.dx, dy: m.dy }));
  return true;
}

window.addEventListener('keydown', (e) => {
  const k0 = e.key.toLowerCase();
  const wasMenu = mode === 'menu';
  const handled = handleKey(ALIAS[k0] || k0);
  if (wasMenu || handled) e.preventDefault();
});

canvas.addEventListener('click', (e) => {    // нажатие по галочке «сохранение»
  if (mode !== 'menu' || busy) return;
  const r = canvas.getBoundingClientRect();
  const col = Math.floor(((e.clientX - r.left) / r.width) * screen.w);
  const row = Math.floor(((e.clientY - r.top) / r.height) * screen.h);
  const hit = menu.saveHit;
  if ((row === hit.y || row === hit.y + 1) && col >= hit.x0 && col < hit.x1) run(toggleSave);
});

// ---------- экранные кнопки ----------
const REPEAT_MS = 160;
const keyOf = (btn) => btn.dataset.key === 'menu' ? (mode === 'menu' ? 'enter' : 'escape') : btn.dataset.key;

for (const btn of document.querySelectorAll('.btn')) {
  let timer = 0;
  const stop = () => { clearInterval(timer); timer = 0; btn.classList.remove('on'); };
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    btn.setPointerCapture(e.pointerId);
    btn.classList.add('on');
    handleKey(keyOf(btn));
    const k = btn.dataset.key;
    if (k !== 'menu' && k !== 'i' && mode !== 'menu') {
      timer = setInterval(() => { if (mode === 'menu') return stop(); handleKey(keyOf(btn)); }, REPEAT_MS);
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

document.body.classList.add('ok');           // дошли досюда — игра работает, «технические работы» скрываются
