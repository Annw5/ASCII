import { CHUNK } from '../shared/chunk.js';
import { MOB_KINDS } from '../shared/objects.js';
import { drawIso } from './iso-view.js';

export const player = { x: 0, y: 0 };
const st = { id: -1, heights: null, objs: null, mobs: [], ready: false };

export function onMessage(msg) {
  if (msg.t === 'chunk') {
    st.id = msg.id;
    st.heights = Uint8Array.from(msg.heights);
    st.objs = Uint8Array.from(msg.objs);
    st.mobs = [];
    st.ready = false;                        // ждём первый снимок уже для этого чанка
  } else if (msg.t === 'state') {
    player.x = msg.you.x;
    player.y = msg.you.y;
    st.mobs = msg.mobs;
    st.ready = !!st.heights;
  }
}

export function renderOnline(screen) {
  screen.clear(0x000000);
  if (!st.ready) { screen.text(1, 1, 'подключение...', 0x888888); return; }
  drawIso(screen, st.heights, player, st.objs, st.mobs);
  const h = st.heights[player.y * CHUNK + player.x];
  screen.text(1, 0, ` chunk:${st.id} x:${player.x} y:${player.y} h:${h} `, 0x888888);
  const talker = st.mobs.find((m) => m.say);
  if (talker) screen.text(1, screen.h - 1, ` ${MOB_KINDS[talker.kind].name}: ${talker.say} `, 0x4de1ff);
}
