import { MOB_KINDS, NPC } from '../shared/objects.js';

export const ui = { list: false };                       // открыт ли список существ

export function drawMobList(screen, mobs) {
  screen.clear(0x000000);
  screen.text(1, 0, ' Существа в чанке (I или Esc — закрыть) ', 0x4de1ff);
  screen.text(1, 2, '  ' + 'Кто'.padEnd(12) + 'HP'.padEnd(7) + 'Клетка'.padEnd(9) + 'Что делает', 0x888888);

  const list = [...mobs].sort((a, b) => (b.kind === NPC) - (a.kind === NPC) || a.kind - b.kind);
  if (!list.length) screen.text(1, 4, 'Здесь никого нет', 0x777777);

  list.forEach((m, i) => {
    const y = 3 + i;
    if (y >= screen.h - 2) return;
    const k = MOB_KINDS[m.kind];
    const hp = m.kind === NPC ? '∞' : `${m.hp}/${m.maxHp}`;   // NPC не умирают
    screen.text(1, y, k.glyph, k.color);
    screen.text(3, y, k.name.padEnd(12), k.color);
    screen.text(15, y, hp.padEnd(7), 0xff8080);
    screen.text(22, y, `${m.x},${m.y}`.padEnd(9), 0x888888);
    screen.text(31, y, m.act || '', 0xcccccc);
  });
  screen.text(1, screen.h - 1, ` Всего: ${list.length} `, 0x888888);
}
