import { SEA, MAXH, CHUNK, hash, OBJ_KINDS, MOB_KINDS, NPC } from '../shared/world.js';

// ---------- клавиши ----------
export const MOVES = [
  { key: 'q', dx: -1, dy:  0 }, { key: 'e', dx:  0, dy: -1 },
  { key: 'z', dx:  0, dy:  1 }, { key: 'c', dx:  1, dy:  0 },
  { key: 'w', dx: -1, dy: -1 }, { key: 's', dx:  1, dy:  1 },
  { key: 'a', dx: -1, dy:  1 }, { key: 'd', dx:  1, dy: -1 },
];
export const ALIAS = { arrowup: 'w', arrowdown: 's', arrowleft: 'a', arrowright: 'd' };

// ---------- цвета ----------
function shade(c, k) {
  const r = Math.min(255, ((c >> 16) & 255) * k);
  const g = Math.min(255, ((c >> 8) & 255) * k);
  const b = Math.min(255, (c & 255) * k);
  return ((r | 0) << 16) | ((g | 0) << 8) | (b | 0);
}

function topColor(h) {
  if (h <= SEA)      return 0x2a6fd6;
  if (h === SEA + 1) return 0xe0c878;
  if (h <= SEA + 5)  return 0x3fa34d;
  if (h <= SEA + 8)  return 0x8a8a8a;
  return 0xf2f2f2;
}

const GLYPHS = {
  water: ['~', '~', '-'], sand: ['.', ':', ','], grass: ['"', ',', "'", '`', ';'],
  stone: ['^', 'n', '^', 'A'], snow: ['*', '+', '.', '*'],
};

function topGlyph(h, r) {
  const set = h <= SEA ? GLYPHS.water : h === SEA + 1 ? GLYPHS.sand : h <= SEA + 5 ? GLYPHS.grass
            : h <= SEA + 8 ? GLYPHS.stone : GLYPHS.snow;
  return set[r % set.length];
}

function wallColor(h, depth) {
  if (h <= SEA) return shade(0x2a6fd6, Math.max(0.35, 0.9 - depth * 0.1));
  let base = depth < 2 ? 0x8b5a2b : 0x7a7a7a;
  if (h === SEA + 1 && depth < 2) base = 0xc8aa60;
  return shade(base, Math.max(0.4, 1 - depth * 0.05));
}

// ---------- мир ----------
const LEFT = ['%', '&', '8'];
const RIGHT = ['#', 'H', 'M'];

function hAt(chunk, x, y) {
  if (x < 0 || y < 0 || x >= CHUNK || y >= CHUNK) return 0;
  const v = chunk[y * CHUNK + x];
  return v > SEA ? v : SEA;
}

export function drawIso(screen, chunk, player, objs, mobs, cx = screen.w >> 1) {
  const occ = new Map();
  for (const m of mobs) occ.set(m.y * CHUNK + m.x, m.kind);
  const H2 = (MAXH + 1) >> 1;
  const baseRow = ((screen.h - (H2 + CHUNK)) >> 1) + H2;
  let pCol = -1, pRow = -1;

  for (let s = 0; s <= CHUNK * 2 - 2; s++) {
    for (let x = Math.max(0, s - (CHUNK - 1)); x <= Math.min(CHUNK - 1, s); x++) {
      const y = s - x;
      const raw = chunk[y * CHUNK + x];
      const h = raw > SEA ? raw : SEA;
      const col = cx + x - y;
      const gRow = baseRow + (s >> 1);
      const top = baseRow + ((s - h) >> 1);

      const g = hash(x, y, 1);
      screen.put(col, top, topGlyph(raw, g), shade(topColor(raw), 0.85 + ((g >>> 8) % 4) * 0.1), 0);

      const hRight = hAt(chunk, x + 1, y);
      for (let r = top + 1; r <= gRow; r++) {
        const i = r - top - 1, lvl = i * 2, z = h - 1 - lvl;
        const wc = wallColor(raw, lvl), gw = hash(x, y, i + 2);
        if (z >= hRight) screen.put(col, r, RIGHT[gw % RIGHT.length], shade(wc, 0.55), 0);
        else             screen.put(col, r, LEFT[gw % LEFT.length],  shade(wc, 0.85), 0);
      }

      const ob = OBJ_KINDS[objs[y * CHUNK + x]];
      if (ob) screen.put(col, top - 1, ob.glyph, ob.color, 0);
      const mk = MOB_KINDS[occ.get(y * CHUNK + x) || 0];
      if (mk) screen.put(col, top - 1, mk.glyph, mk.color, 0);
      if (x === player.x && y === player.y) { pCol = col; pRow = top - 1; }
    }
  }

  const here = chunk[player.y * CHUNK + player.x];
  for (const m of MOVES) {                   // подсказки клавиш на соседних клетках
    const nx = player.x + m.dx, ny = player.y + m.dy;
    if (nx < 0 || ny < 0 || nx >= CHUNK || ny >= CHUNK) continue;
    const i = ny * CHUNK + nx, raw = chunk[i], h = raw > SEA ? raw : SEA;
    const ok = raw > SEA && Math.abs(raw - here) <= 1 && objs[i] === 0 && !occ.has(i);
    screen.hint(cx + nx - ny, baseRow + ((nx + ny - h) >> 1), m.key.toUpperCase(), ok ? 0x6dff6d : 0x803030);
  }
  if (pCol >= 0) screen.put(pCol, pRow, '@', 0xffe14d, 0);
}

// ---------- список существ (боковая панель) ----------
export const ui = { list: false };
export const PANEL = 40;                     // ширина панели в клетках

export function drawMobList(screen, mobs, x0) {
  const x = x0 + 1, w = PANEL - 2;
  screen.text(x, 0, `Существа: ${mobs.length} (I — закрыть)`, 0x4de1ff);
  screen.text(x, 2, '  ' + 'Кто'.padEnd(10) + 'HP'.padEnd(5) + 'Клетка', 0x888888);
  const list = [...mobs].sort((a, b) => (b.kind === NPC) - (a.kind === NPC) || a.kind - b.kind);
  if (!list.length) screen.text(x, 4, 'Здесь никого нет', 0x777777);
  list.forEach((m, i) => {
    const y = 3 + i * 2;
    if (y >= screen.h - 1) return;
    const k = MOB_KINDS[m.kind];
    screen.text(x, y, k.glyph, k.color);
    screen.text(x + 2, y, k.name.padEnd(10), k.color);
    screen.text(x + 12, y, (m.kind === NPC ? '∞' : `${m.hp}/${m.maxHp}`).padEnd(5), 0xff8080);
    screen.text(x + 17, y, `${m.x},${m.y}`, 0x888888);
    screen.text(x + 2, y + 1, (m.act || '').slice(0, w - 2), 0xaaaaaa);
  });
}

// ---------- меню ----------
const ITEMS = ['online', 'single', 'save'];
export const menu = { sel: 1, note: '', save: false, saveHit: { y: -1, x0: 0, x1: 0 } };

function center(screen, y, str, fg) {
  screen.text(Math.max(0, (screen.w - [...str].length) >> 1), y, str, fg);
}

export function renderMenu(screen) {
  screen.clear(0x000000);
  const y0 = Math.max(1, (screen.h >> 1) - 6);
  center(screen, y0, 'A S C I I', 0x4de1ff);
  const rows = [
    { text: 'Онлайн', off: 0x888888 },
    { text: 'Одиночная игра', off: 0x888888 },
    { text: `[${menu.save ? '✓' : ' '}] сохранение`, off: menu.save ? 0x6dff6d : 0x777777 },
  ];
  rows.forEach((r, i) => {
    const on = i === menu.sel;
    const str = (on ? '> ' : '  ') + r.text + (on ? ' <' : '  ');
    const y = y0 + 3 + i * 2;
    const x0 = Math.max(0, (screen.w - [...str].length) >> 1);
    screen.text(x0, y, str, on ? 0xffe14d : r.off);
    if (i === 2) menu.saveHit = { y, x0: x0 - 1, x1: x0 + [...str].length + 1 };
  });
  center(screen, y0 + 10, 'W/S — выбор, Enter — выбрать/переключить, 1/2/3 — быстрый выбор', 0x555555);
  center(screen, y0 + 11, '1 — онлайн, 2 — одиночная игра, 3 — сохранение вкл/выкл', 0x555555);
  center(screen, y0 + 12, 'Сохранение: прогресс одиночной игры пишется в файл', 0x555555);
  center(screen, y0 + 13, 'на устройстве (надёжнее кеша).', 0x555555);
  center(screen, y0 + 14, 'Прогресс одиночной игры в любом случае хранится в кеше.', 0x555555);
  if (menu.note) center(screen, y0 + 16, menu.note, 0xff6a6a);
}

export function menuKey(k) {                 // 'online' | 'single' | 'save' | null
  menu.note = '';
  const n = ITEMS.length;
  if (k === 'w') menu.sel = (menu.sel + n - 1) % n;
  else if (k === 's') menu.sel = (menu.sel + 1) % n;
  else if (k === 'enter') return ITEMS[menu.sel];
  else if (k === '1' || k === '2' || k === '3') { menu.sel = Number(k) - 1; return ITEMS[menu.sel]; }
  return null;
}
