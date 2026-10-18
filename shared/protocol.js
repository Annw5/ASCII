export const enc = (msg) => JSON.stringify(msg);
export const dec = (str) => { try { return JSON.parse(str); } catch { return null; } };
