const ITEMS = ['online', 'single', 'save'];              // порядок сверху вниз
export const menu = { sel: 1, note: '', save: false, saveHit: { y: -1, x0: 0, x1: 0 } };   // sel: 1 — по умолчанию выбрана одиночная игра

function center(screen, y, str, fg) {
  screen.text(Math.max(0, (screen.w - [...str].length) >> 1), y, str, fg);
}

export function renderMenu(screen) {
  screen.clear(0x000000);
  const y0 = Math.max(1, (screen.h >> 1) - 6);
  center(screen, y0, 'A S C I I', 0x4de1ff);

  const rows = [
    { text: 'Онлайн',         ok: 0xffe14d, off: 0x888888 },
    { text: 'Одиночная игра', ok: 0xffe14d, off: 0x888888 },
    { text: `[${menu.save ? '✓' : ' '}] сохранение`, ok: 0xffe14d, off: menu.save ? 0x6dff6d : 0x777777 },
  ];
  rows.forEach((r, i) => {
    const on = i === menu.sel;
    const str = (on ? '> ' : '  ') + r.text + (on ? ' <' : '  ');
    const y = y0 + 3 + i * 2;
    const x0 = Math.max(0, (screen.w - [...str].length) >> 1);
    screen.text(x0, y, str, on ? r.ok : r.off);
    if (i === 2) menu.saveHit = { y, x0: x0 - 1, x1: x0 + [...str].length + 1 };   // область нажатия (мышь и палец)
  });

  center(screen, y0 + 10, 'W/S — выбор, Enter — выбрать/переключить, 1/2/3 — быстрый выбор', 0x555555);
  center(screen, y0 + 11, '1 — онлайн, 2 — одиночная игра, 3 — сохранение вкл/выкл', 0x555555);
  center(screen, y0 + 12, 'Сохранение: прогресс одиночной игры пишется в файл', 0x555555);
  center(screen, y0 + 13, 'на устройстве (надёжнее кеша).', 0x555555);
  center(screen, y0 + 14, 'Прогресс одиночной игры в любом случае хранится в кеше.', 0x555555);
  if (menu.note) center(screen, y0 + 16, menu.note, 0xff6a6a);
}

// k — нормализованная клавиша. Возвращает 'online' | 'single' | 'save' | null
export function menuKey(k) {
  menu.note = '';
  const n = ITEMS.length;
  if (k === 'w') menu.sel = (menu.sel + n - 1) % n;
  else if (k === 's') menu.sel = (menu.sel + 1) % n;
  else if (k === 'enter') return ITEMS[menu.sel];
  else if (k === '1' || k === '2' || k === '3') {
    menu.sel = Number(k) - 1;                            // быстрый выбор тоже двигает курсор
    return ITEMS[menu.sel];
  }
  return null;
}
