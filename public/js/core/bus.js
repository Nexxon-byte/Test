// Minimaler Event-Bus.

const handlers = new Map();

export const bus = {
  on(type, fn) {
    if (!handlers.has(type)) handlers.set(type, new Set());
    handlers.get(type).add(fn);
    return () => handlers.get(type)?.delete(fn);
  },
  emit(type, payload) {
    const set = handlers.get(type);
    if (set) for (const fn of [...set]) fn(payload);
  },
  clear(type) { handlers.delete(type); },
};
