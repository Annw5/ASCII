export const MODES = ['single', 'online'];
const LABELS = ['Одиночная игра', 'Онлайн'];
export const menu = { sel: 0, note: '' };

function center(screen, y, str, fg) {
  screen.text(Math.max(0, (screen.w - [...str].length) >> 1), y, str, fg);
}

export function renderMenu(screen) {
  screen.clear(0x000000);
  const y0 = Math.max(1, (screen.h >> 1) - 5);
  center(screen, y0, 'A S C I I', 0x4de1ff);
  LABELS.forEach((t, i) => {
    const on = i === menu.sel;
    center(screen, y0 + 3 + i * 2, (on ? '> ' : '  ') + t + (on ? ' <' : '  '), on ? 0xffe14d : 0x888888);
  });
  center(screen, y0 + 9, 'W/S — выбор, Enter — начать, 1/2 — быстрый выбор', 0x555555);
  if (menu.note) center(screen, y0 + 11, menu.note, 0xff6a6a);
}

// k — нормализованная клавиша ('w', 's', 'enter', '1', '2'). Возвращает 'single' | 'online' | null
export function menuKey(k) {
  menu.note = '';
  if (k === 'w') menu.sel = (menu.sel + 1) % MODES.length;
  else if (k === 's') menu.sel = (menu.sel + 1) % MODES.length;
  else if (k === 'enter') return MODES[menu.sel];
  else if (k === '1') return MODES[0];
  else if (k === '2') return MODES[1];
  return null;
}
