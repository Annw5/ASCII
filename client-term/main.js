import { Screen } from '../client-core/screen.js';
import { spawn, tryMove, renderGame } from '../client-core/game.js';

const out = process.stdout;
let screen = new Screen(out.columns, out.rows);

function render() {
  renderGame(screen);
  out.write(screen.diff());
}

out.write('\x1b[?1049h\x1b[?25l\x1b[?7l');
function quit() {
  out.write('\x1b[0m\x1b[?7h\x1b[?25h\x1b[?1049l');
  process.exit();
}

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', (key) => {
  const k = key.toString();
  if (k === 'q' || k === '\x03') quit();
  if (k === 'w' || k === '\x1b[A') tryMove(0, -1);
  if (k === 'a' || k === '\x1b[D') tryMove(-1, 0);
  if (k === 's' || k === '\x1b[B') tryMove(0, 1);
  if (k === 'd' || k === '\x1b[C') tryMove(1, 0);
  render();
});

out.on('resize', () => {
  screen = new Screen(out.columns, out.rows);
  render();
});

spawn();
render();
