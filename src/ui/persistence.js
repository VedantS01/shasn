const KEY = "shasn:savegame:v1";

export const serialize = (state) => JSON.stringify(state);
export const deserialize = (str) => JSON.parse(str);

export function save(state, storage = globalThis.localStorage) {
  if (!storage) return;
  storage.setItem(KEY, serialize(state));
}
export function load(storage = globalThis.localStorage) {
  if (!storage) return null;
  const raw = storage.getItem(KEY);
  return raw ? deserialize(raw) : null;
}
export function clearSave(storage = globalThis.localStorage) {
  if (!storage) return;
  storage.removeItem(KEY);
}
export function hasSave(storage = globalThis.localStorage) {
  return !!(storage && storage.getItem(KEY));
}
