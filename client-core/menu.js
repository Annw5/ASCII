export const MODES = ['single', 'online'];
const LABELS = ['Одиночная игра', 'Онлайн'];
export const menu = { sel: 0, note: '', save: false, saveHit: { y: -1, x0: 0, x1: 0 } };

function center(screen, y, str, fg) {
  screen.text(Math.max(0, (screen.w - [...str].length) >> 1), y, str, fg);
}

export function renderMenu(screen) {
  screen.clear(0x000000);
  const y0 = Math.max(1, (screen.h >> 1) - 6);
  center(screen, y0, 'A S C I I', 0x4de1ff);
  LABELS.forEach((t, i) => {
    const on = i === menu.sel;
    center(screen, y0 + 3 + i * 3, (on ? '> ' : '  ') + t + (on ? ' <' : '  '), on ? 0xffe14d : 0x888888);
  });

  // галочка «сохранение» под одиночной игрой
  const box = `[${menu.save ? '✓' : ' '}] сохранение`;
  const len = [...box].length;
  const x0 = Math.max(0, (screen.w - len) >> 1);
  screen.text(x0, y0 + 4, box, menu.save ? 0x6dff6d : 0x777777);
  menu.saveHit = { y: y0 + 4, x0: x0 - 1, x1: x0 + len + 1 };   // область нажатия (для мыши и пальца)

  center(screen, y0 + 9,  'W/S — выбор, Enter — начать, 1/2 — быстрый выбор', 0x555555);
  center(screen, y0 + 10, '3 — включить/выключить сохранение: прогресс одиночной', 0x555555);
  center(screen, y0 + 11, 'игры пишется в файл на устройстве (надёжнее кеша)', 0x555555);
  center(screen, y0 + 12, 'Прогресс одиночной игры в любом случае хранится в кеше.', 0x555555);
  if (menu.note) center(screen, y0 + 14, menu.note, 0xff6a6a);
}

// k — нормализованная клавиша. Возвращает 'single' | 'online' | 'save' | null
export function menuKey(k) {
  menu.note = '';
  if (k === 'w') menu.sel = (menu.sel + MODES.length - 1) % MODES.length;
  else if (k === 's') menu.sel = (menu.sel + 1) % MODES.length;
  else if (k === 'enter') return MODES[menu.sel];
  else if (k === '1') return MODES[0];
  else if (k === '2') return MODES[1];
  else if (k === '3') return 'save';
  return null;
}
