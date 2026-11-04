// storage.js — persistencia de partituras en IndexedDB con fallback en memoria

const DB_NAME = 'SheetMusicDB';
const DB_VERSION = 1;
const STORE_SCORES = 'scores';
const STORE_META = 'meta';

const memoryStore = {
  scores: new Map(),
  meta: new Map(),
  reset() {
    this.scores.clear();
    this.meta.clear();
  },
};

function getIndexedDB() {
  if (typeof indexedDB !== 'undefined') return indexedDB;
  if (typeof window !== 'undefined' && window.indexedDB) return window.indexedDB;
  return null;
}

let cachedDbPromise = null;

function openDB() {
  if (cachedDbPromise) return cachedDbPromise;

  const idb = getIndexedDB();
  if (!idb) return Promise.resolve(null);

  cachedDbPromise = new Promise((resolve, reject) => {
    const request = idb.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_SCORES)) {
        db.createObjectStore(STORE_SCORES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        cachedDbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      cachedDbPromise = null;
      reject(request.error);
    };
  });

  return cachedDbPromise;
}

async function saveScore(score) {
  const id = score.id || score.name;
  const record = {
    id,
    name: score.name,
    type: score.type,
    data: score.data,
    updatedAt: score.updatedAt || Date.now(),
  };

  const db = await openDB();
  if (db) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_SCORES, STORE_META], 'readwrite');
      tx.objectStore(STORE_SCORES).put(record);
      tx.objectStore(STORE_META).put({ key: 'lastActiveId', value: id });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } else {
    // structuredClone reproduce fielmente el Structured Clone de IndexedDB,
    // garantizando que datos desasociados o no clonables lancen error aquí también
    const cloned = (typeof structuredClone === 'function')
      ? structuredClone(record)
      : record;
    memoryStore.scores.set(id, cloned);
    memoryStore.meta.set('lastActiveId', id);
  }

  return record;
}

async function getScore(id) {
  const db = await openDB();
  if (db) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_SCORES], 'readonly');
      const req = tx.objectStore(STORE_SCORES).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }
  return memoryStore.scores.get(id) || null;
}

async function getLastActiveScore() {
  const db = await openDB();
  if (db) {
    const lastId = await new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_META], 'readonly');
      const req = tx.objectStore(STORE_META).get('lastActiveId');
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => reject(req.error);
    });
    if (!lastId) return null;
    return getScore(lastId);
  }

  const lastId = memoryStore.meta.get('lastActiveId');
  if (!lastId) return null;
  return memoryStore.scores.get(lastId) || null;
}

async function listScores() {
  const db = await openDB();
  if (db) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_SCORES], 'readonly');
      const req = tx.objectStore(STORE_SCORES).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
  return Array.from(memoryStore.scores.values());
}

async function clear() {
  const db = await openDB();
  if (db) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_SCORES, STORE_META], 'readwrite');
      tx.objectStore(STORE_SCORES).clear();
      tx.objectStore(STORE_META).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  memoryStore.scores.clear();
  memoryStore.meta.clear();
}

const ScoreStorage = {
  saveScore,
  getScore,
  getLastActiveScore,
  listScores,
  clear,
};

if (typeof window !== 'undefined') {
  window.ScoreStorage = ScoreStorage;
}

if (typeof module !== 'undefined') {
  module.exports = ScoreStorage;
}

