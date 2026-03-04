// ===== PERSISTENT STORAGE (IndexedDB + localStorage fallback) =====
// Android WebView peut effacer localStorage à la fermeture. IndexedDB persiste.
const PhiloDB = {
  db: null,
  STORE: 'data',
  DB_NAME: 'philo-dict',
  
  open() {
    return new Promise((resolve, reject) => {
      if (this.db) { resolve(this.db); return; }
      const req = indexedDB.open(this.DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        e.target.result.createObjectStore(this.STORE);
      };
      req.onsuccess = (e) => { this.db = e.target.result; resolve(this.db); };
      req.onerror = () => resolve(null); // Fallback to localStorage
    });
  },
  
  async get(key) {
    try {
      const db = await this.open();
      if (!db) return null;
      return new Promise((resolve) => {
        const tx = db.transaction(this.STORE, 'readonly');
        const req = tx.objectStore(this.STORE).get(key);
        req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
        req.onerror = () => resolve(null);
      });
    } catch(e) { return null; }
  },
  
  async set(key, value) {
    try {
      const db = await this.open();
      if (!db) return;
      const tx = db.transaction(this.STORE, 'readwrite');
      tx.objectStore(this.STORE).put(value, key);
    } catch(e) {}
    // Always also write to localStorage as secondary backup
    try { localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); } catch(e) {}
  }
};

// Synchronous load from localStorage (instant), IDB will override in background
function lsGet(key, fallback) {
  try { var v = localStorage.getItem(key); return v !== null ? v : fallback; } catch(e) { return fallback; }
}

