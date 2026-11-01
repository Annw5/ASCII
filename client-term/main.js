#!/usr/bin/env node
import { homedir, userInfo } from 'node:os';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Screen } from '../client-core/screen.js';
import { resume, tryMove, renderGame, snapshot, tickGame } from '../client-core/game.js';
import { onMessage, renderOnline } from '../client-core/online.js';
import { MOVES } from '../client-core/controls.js';
import { menu, renderMenu, menuKey } from '../client-core/menu.js';
import { encode, decode } from '../client-core/save.js';
import { TICK_MS } from '../shared/constants.js';

const out = process.stdout;
let screen = new Screen(out.columns, out.rows);
let mode = 'menu';
let ws = null;

function render() {
  if (mode === 'menu') renderMenu(screen);
  else if (mode === 'single') renderGame(screen);
  else renderOnline(screen);
  out.write(screen.diff());
}

const SAVE_FILE = join(homedir(), '.ascii-save');
const SETTINGS_FILE = join(homedir(), '.ascii-settings');
let cache = null;                                        // «кеш»: последнее сохранение в памяти программы
try { menu.save = readFileSync(SETTINGS_FILE, 'utf8').trim() === 'save=1'; } catch {}

function saveNow() {
  if (mode !== 'single') return;
  cache = encode(snapshot());                            // кеш: всегда
  if (menu.save) { try { writeFileSync(SAVE_FILE, cache); } catch {} }   // файл: только если включено
}

function toggleSave() {
  menu.save = !menu.save;
  try { writeFileSync(SETTINGS_FILE, menu.save ? 'save=1' : 'save=0'); } catch {}
}

function startSingle() {
  let s = decode(cache);
  if (menu.save) { try { s = decode(readFileSync(SAVE_FILE, 'utf8').trim()) || s; } catch {} }
  resume(s);
  mode = 'single';
}

function startOnline() {
  if (typeof WebSocket === 'undefined') { menu.note = 'Для онлайна нужен Node 22+'; return; }
  const url = process.env.ASCII_SERVER || 'ws://localhost:3000';
  const sock = new WebSocket(url);
  ws = sock;
  mode = 'online';
  sock.onopen = () => sock.send(JSON.stringify({ t: 'hello', name: userInfo().username || 'Путник' }));
  sock.onmessage = (e) => { onMessage(JSON.parse(e.data)); render(); };
  sock.onclose = () => {
    if (ws !== sock) return;
    ws = null; mode = 'menu'; menu.note = 'Нет соединения с сервером';
    render();
  };
}

function backToMenu() {
  saveNow();
  if (ws) { const s = ws; ws = null; s.close(); }
  mode = 'menu';
}

out.write('\x1b[?1049h\x1b[?25l\x1b[?7l');
function quit() {
  saveNow();
  out.write('\x1b[0m\x1b[?7h\x1b[?25h\x1b[?1049l');
  process.exit();
}

const KEYS = {
  '\x1b[A': 'w', '\x1b[B': 's', '\x1b[D': 'a', '\x1b[C': 'd',
  '\r': 'enter', '\x1b': 'escape', '\x03': 'ctrl-c',
};

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', (key) => {
  const raw = key.toString();
  const k = KEYS[raw] ?? raw.toLowerCase();
  if (k === 'ctrl-c') return quit();

  if (mode === 'menu') {
    if (k === 'escape' || k === 'q') return quit();
    const m = menuKey(k);
    if (m === 'single') startSingle();
    else if (m === 'online') startOnline();
    else if (m === 'save') toggleSave();
  } else if (k === 'escape') {
    backToMenu();
  } else {
    const m = MOVES.find((m) => m.key === k);
    if (m) {
      if (mode === 'single') { tryMove(m.dx, m.dy); saveNow(); }
      else if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'move', dx: m.dx, dy: m.dy }));
    }
  }
  render();
});

out.on('resize', () => { screen = new Screen(out.columns, out.rows); render(); });

render();

setInterval(() => { if (mode === 'single') { tickGame(); render(); } }, TICK_MS);
