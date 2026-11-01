// Файл сохранения на устройстве. Работает через File System Access API (Chrome/Edge на компьютере).
// Ссылка на выбранный файл хранится в IndexedDB.
const DB = 'ascii-files', STORE = 'h', KEY = 'save';
export const canPick = 'showSaveFilePicker' in window;

let handle = null;
let chain = Promise.resolve();                           // записи идут по очереди, чтобы не мешали друг другу

function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbGet() {
  const db = await idb();
  return new Promise((res, rej) => {
    const q = db.transaction(STORE).objectStore(STORE).get(KEY);
    q.onsuccess = () => res(q.result || null);
    q.onerror = () => rej(q.error);
  });
}
async function idbSet(v) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(v, KEY);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

async function allowed(h, ask) {
  const o = { mode: 'readwrite' };
  if ((await h.queryPermission(o)) === 'granted') return true;
  return ask && (await h.requestPermission(o)) === 'granted';   // ask — только из нажатия пользователя
}

// Подключить ранее выбранный файл. true — файл доступен
export async function open(ask) {
  if (!canPick) return false;
  try {
    if (!handle) handle = await idbGet();
    return !!handle && (await allowed(handle, ask));
  } catch { return false; }
}

// Показать окно выбора файла (бросает ошибку, если пользователь отменил)
export async function choose() {
  handle = await showSaveFilePicker({
    suggestedName: 'ascii-save.txt',
    types: [{ description: 'Сохранение ASCII', accept: { 'text/plain': ['.txt'] } }],
  });
  await idbSet(handle);
}

export async function read() {
  try { return (await (await handle.getFile()).text()).trim(); } catch { return null; }
}

export function write(text) {
  if (!handle) return;
  chain = chain.then(async () => {
    const w = await handle.createWritable();
    await w.write(text);
    await w.close();
  }).catch(() => {});
}

// ---- запасной вариант для браузеров без File System Access ----
export function download(text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  a.download = 'ascii-save.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function pickText() {
  return new Promise((res) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,text/plain';
    input.onchange = async () => res(input.files[0] ? (await input.files[0].text()).trim() : null);
    input.addEventListener('cancel', () => res(null));
    input.click();
  });
}
