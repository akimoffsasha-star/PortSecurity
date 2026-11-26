/**
 * cache.js — кеш стану в IndexedDB.
 *
 * Дозволяє показати інтерфейс одразу після відкриття сторінки,
 * не чекаючи відповіді Supabase. Ключ «app_state» зберігає
 * ports / facilities / inspections / vessels і мітку savedAt.
 */

const idbCache = {
  /**
   * Відкриває (або створює) базу maritime_security_cache, store «kv».
   * @returns {Promise<IDBDatabase>}
   */
  open() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error("No IndexedDB"));
      const req = indexedDB.open("maritime_security_cache", 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains("kv")) {
          req.result.createObjectStore("kv");
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Читає значення за ключем. При помилці повертає null (не кидає).
   * @param {string} key
   * @returns {Promise<*>}
   */
  async get(key) {
    try {
      const db = await this.open();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction("kv", "readonly");
        const r = tx.objectStore("kv").get(key);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    } catch (_) {
      return null;
    }
  },

  /**
   * Записує значення за ключем. Помилки ігноруються (кеш не критичний).
   * @param {string} key
   * @param {*} val
   * @returns {Promise<void>}
   */
  async set(key, val) {
    try {
      const db = await this.open();
      await new Promise((resolve, reject) => {
        const tx = db.transaction("kv", "readwrite");
        const r = tx.objectStore("kv").put(val, key);
        r.onsuccess = () => resolve();
        r.onerror = () => reject(r.error);
      });
    } catch (_) { /* кеш опційний */ }
  }
};
