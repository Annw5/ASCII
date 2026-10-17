import { Screen } from '../client-core/screen.js';
import { drawIso } from '../client-core/iso-view.js';
import { heightAt, SEA } from '../shared/terrain.js';

const out = process.stdout;
const player = { x: 0, y: 0 };
while (heightAt(player.x, player.y) <= SEA) player.x++; // не стартуем в воде

let screen = new Screen(out.columns, out.rows);

function render() {
  screen.clear();
  drawIso(screen, player);
  const h = heightAt(player.x, player.y);
  screen.text(1, 0, ` x:${player.x} y:${player.y} h:${h} `);
  out.write(screen.diff());
}

// Можно подняться максимум на 1 уровень и нельзя войти в воду
function tryMove(dx, dy) {
  const here = heightAt(player.x, player.y);
  const next = heightAt(player.x + dx, player.y + dy);
  if (next > SEA && Math.abs(next - here) <= 1) {
    player.x += dx;
    player.y += dy;
  }
}

out.write('\x1b[?1049h\x1b[?25l\x1b[?7l'); // альт. экран, без курсора, без автопереноса
function quit() {
  out.write('\x1b[0m\x1b[?7h\x1b[?25h\x1b[?1049l');
  process.exit();
}

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', (key) => {
  const k = key.toString();
  if (k === 'q' || k === '\x03') quit();
  if (k === 'w' || k === '\x1b[A') tryMove(0, -1); // вверх-вправо
  if (k === 'a' || k === '\x1b[D') tryMove(-1, 0); // вверх-влево
  if (k === 's' || k === '\x1b[B') tryMove(0, 1);  // вниз-влево
  if (k === 'd' || k === '\x1b[C') tryMove(1, 0);  // вниз-вправо
  render();
});

out.on('resize', () => {
  screen = new Screen(out.columns, out.rows);
  render();
});

render();
