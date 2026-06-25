/* store.js — the single data seam.
 *
 * Every module reads/writes through Store. Today it's backed by localStorage
 * (on-device, private, offline). To add cross-device sync later, only THIS
 * file changes — no module is touched. That's the point of the seam.
 */
(function () {
  const PREFIX = 'life:';
  const listeners = {}; // key -> Set<fn>

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    if (listeners[key]) listeners[key].forEach((fn) => fn(value));
    return value;
  }

  const Store = {
    get: read,

    set: write,

    // update(key, prev => next) — read-modify-write in one shot.
    update(key, fn, fallback) {
      const next = fn(read(key, fallback));
      return write(key, next);
    },

    remove(key) {
      localStorage.removeItem(PREFIX + key);
      if (listeners[key]) listeners[key].forEach((fn) => fn(undefined));
    },

    // Notify when a key changes (e.g. a tile refreshing after a log).
    subscribe(key, fn) {
      (listeners[key] || (listeners[key] = new Set())).add(fn);
      return () => listeners[key].delete(fn);
    },

    // Export/import the whole dataset — backup, or hand-off to a future sync.
    exportAll() {
      const out = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith(PREFIX)) out[k.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(k));
      }
      return out;
    },
    importAll(obj) {
      Object.entries(obj).forEach(([k, v]) => write(k, v));
    },
  };

  // Small shared helpers most modules want.
  Store.today = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD, local-ish
  Store.uid = () => Math.random().toString(36).slice(2, 9);

  window.Store = Store;
})();
