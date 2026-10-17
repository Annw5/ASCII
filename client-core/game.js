import { heightAt, SEA } from '../shared/terrain.js';
import { drawIso } from './iso-view.js';

// Игрок: объект с двумя полями. export — чтобы другие файлы могли его взять
export const player = { x: 0, y: 0 };

// Ставим игрока на сушу: пока под ним вода — сдвигаем вправо
export function spawn() {
  while (heightAt(player.x, player.y) <= SEA) player.x++;
}

// Попытка шагнуть на (dx, dy): подняться можно максимум на 1 уровень, в воду нельзя
export function tryMove(dx, dy) {
  const here = heightAt(player.x, player.y);
  const next = heightAt(player.x + dx, player.y + dy);
  if (next > SEA && Math.abs(next - here) <= 1) {
    player.x += dx;
    player.y += dy;
  }
}

// Нарисовать кадр в переданный экран-буфер (куда он потом попадёт — терминал или canvas — игре всё равно)
export function renderGame(screen) {
  screen.clear();
  drawIso(screen, player);
  const h = heightAt(player.x, player.y);
  screen.text(1, 0, ` x:${player.x} y:${player.y} h:${h} `);
}
