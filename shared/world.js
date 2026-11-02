export const PORT = 3000;
export const TICK_MS = 500;                  // один ход мира
export const SEA = 3;                        // уровень воды
export const MAXH = 12;                      // максимальная высота
export const CHUNK = 32;                     // сторона чанка
export const POOL = 100;                     // сколько всего чанков

export function hash(a, b, c) {              // «случайное», но всегда одинаковое число
  let n = Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}

export function heightAt(x, y) {
  const v = 6
    + 3.5 * Math.sin(x * 0.13)
    + 3   * Math.cos(y * 0.17)
    + 2   * Math.sin((x + y) * 0.09)
    + 1.5 * Math.sin(x * 0.5) * Math.cos(y * 0.45);
  return Math.max(0, Math.min(MAXH, Math.round(v)));
}

const EDGE = SEA + 3;                        // высота на краю чанка (всегда суша)
const BORDER = 3;                            // с какого расстояния от края выравниваем

export function makeChunk(ox, oy) {
  const heights = new Uint8Array(CHUNK * CHUNK);
  for (let y = 0; y < CHUNK; y++) {
    for (let x = 0; x < CHUNK; x++) {
      let h = heightAt(ox + x, oy + y);
      const d = Math.min(x, y, CHUNK - 1 - x, CHUNK - 1 - y);
      if (d < BORDER) {
        const w = d / BORDER;
        h = Math.round(EDGE * (1 - w) + h * w);
      }
      heights[y * CHUNK + x] = h;
    }
  }
  return heights;
}

export const TREE = 1, ROCK = 2;
export const OBJ_KINDS = [
  null,
  { glyph: '♣', color: 0x1f7a2f },
  { glyph: 'o', color: 0xb0b0b0 },
];

// предметы: 1 дерево, 2 камень, 3 мясо, 100+вид зверя — шкура этого зверя
export const ITEMS = [null, 'дерево', 'камень', 'мясо'];

const BEAST_LIST = [
  ['антилопа', 0xe8c87a], ['барсук', 0xd8d8a0], ['волк', 0x9aa5c0], ['глухарь', 0x7fd1a0],
  ['дикобраз', 0xc9a0ff], ['енот', 0xa8a8b8], ['ёж', 0xb08060], ['журавль', 0xf0f0ff],
  ['заяц', 0xffffff], ['ирбис', 0xcfe3ff], ['косуля', 0xffc05a], ['лиса', 0xff6a1a],
  ['медведь', 0xc97b3a], ['нутрия', 0x8fd0c0], ['олень', 0xffa040], ['песец', 0xe0f0ff],
  ['рысь', 0xd0b060], ['сова', 0xe0a0e0], ['тигр', 0xffd02a], ['утка', 0x40d0a0],
  ['фазан', 0xff8080], ['хорёк', 0xe0c0a0], ['цапля', 0xb0c0ff], ['чайка', 0xffffff],
  ['шакал', 0xd09040], ['щегол', 0xff5050], ['эму', 0xa0905a], ['юрок', 0x90e060],
  ['ящерица', 0x60ff90],
];
export const BEASTS = BEAST_LIST.length;
export const NPC = BEASTS + 1;
export const MOB_KINDS = [
  null,
  ...BEAST_LIST.map(([name, color]) => ({ glyph: name[0], color, name })),
  { glyph: '☺', color: 0x4de1ff, name: 'NPC' },
];

export function makeObjects(id, heights) {   // деревья и камни
  const objs = new Uint8Array(CHUNK * CHUNK);
  for (let y = 0; y < CHUNK; y++) {
    for (let x = 0; x < CHUNK; x++) {
      if (Math.min(x, y, CHUNK - 1 - x, CHUNK - 1 - y) < 2) continue;   // у края пусто
      const h = heights[y * CHUNK + x];
      const r = hash(x, y, id + 1000) % 100;
      if (h > SEA + 1 && h <= SEA + 5) { if (r < 8) objs[y * CHUNK + x] = TREE; }
      else if (h > SEA + 5 && h <= SEA + 8) { if (r < 4) objs[y * CHUNK + x] = ROCK; }
    }
  }
  return objs;
}

export function makeMobs(id, heights, objs) {   // 9 зверей + 3 NPC
  const mobs = [];
  for (let k = 0; k < 60 && mobs.length < 12; k++) {
    const x = hash(id, k, 11) % CHUNK;
    const y = hash(id, k, 12) % CHUNK;
    const i = y * CHUNK + x;
    const d = Math.min(x, y, CHUNK - 1 - x, CHUNK - 1 - y);
    if (d < 2 || heights[i] <= SEA + 1 || objs[i] !== 0) continue;
    if (mobs.some((m) => m.x === x && m.y === y)) continue;
    mobs.push({ x, y, kind: mobs.length < 9 ? 1 + hash(id, k, 13) % BEASTS : NPC });
  }
  return mobs;
}

// ---------- предметы и торговля ----------
export const itemName = (id) => id >= 100 ? `шкура: ${MOB_KINDS[id - 100].name}` : ITEMS[id] || '?';

// give/get: [предмет, количество]; 'skin' — шкура: при отдаче любая, при получении случайная
export const OFFERS = [
  { give: [2, 1], get: [1, 1] },             // камень -> дерево
  { give: [1, 1], get: [2, 1] },             // дерево -> камень
  { give: [1, 3], get: [3, 1] },             // 3 дерева -> мясо
  { give: [2, 3], get: [3, 1] },             // 3 камня -> мясо
  { give: [3, 1], get: [1, 3] },             // мясо -> 3 дерева
  { give: [3, 1], get: [2, 3] },             // мясо -> 3 камня
  { give: [3, 3], get: ['skin', 1] },        // 3 мяса -> шкура случайного зверя
  { give: ['skin', 1], get: [3, 3] },        // шкура -> 3 мяса
];

const side = (id, n, get) => `${id === 'skin' ? (get ? 'шкура случайного' : 'шкура любого') : itemName(id)} x${n}`;
export const offerText = (o) => `${side(...o.give, false)} → ${side(...o.get, true)}`;

function giveId(inv, o) {                    // какой предмет реально отдаём (или null)
  const [g, n] = o.give;
  const id = g === 'skin' ? Object.keys(inv).find((k) => k >= 100 && inv[k] >= 1) : g;
  return id !== undefined && (inv[id] || 0) >= n ? id : null;
}

export const canTrade = (inv, i) => giveId(inv, OFFERS[i]) !== null;

export function doTrade(inv, i) {            // true — обмен выполнен
  const o = OFFERS[i];
  if (!o) return false;
  const gid = giveId(inv, o);
  if (gid === null) return false;
  inv[gid] -= o.give[1];
  if (inv[gid] <= 0) delete inv[gid];
  const rid = o.get[0] === 'skin' ? 100 + 1 + Math.floor(Math.random() * BEASTS) : o.get[0];
  inv[rid] = (inv[rid] || 0) + o.get[1];
  return true;
}
