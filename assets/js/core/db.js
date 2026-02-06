// assets/js/core/db.js
// Toto Manager - IndexedDB Core
// Stable, offline-first, admin-safe

const DB_NAME = "toto_manager_db";
const DB_VERSION = 1;

export const STORES = {
  totos: "totos",
  drivers: "drivers",
  locations: "locations",
  attendance: "attendance",
  trips: "trips",
  expenses: "expenses"
};

let _db = null;

// ------------------------------------
// Open DB
// ------------------------------------
export function openDB() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject("DB open failed");

    request.onsuccess = () => {
      _db = request.result;
      resolve(_db);
    };

    request.onupgradeneeded = (e) => {
      const db = e.target.result;

      // ----------------
      // totos
      // ----------------
      if (!db.objectStoreNames.contains(STORES.totos)) {
        const store = db.createObjectStore(STORES.totos, { keyPath: "id" });
        store.createIndex("name", "name", { unique: false });
      }

      // ----------------
      // drivers
      // ----------------
      if (!db.objectStoreNames.contains(STORES.drivers)) {
        const store = db.createObjectStore(STORES.drivers, { keyPath: "id" });
        store.createIndex("name", "name", { unique: false });
      }

      // ----------------
      // locations
      // ----------------
      if (!db.objectStoreNames.contains(STORES.locations)) {
        const store = db.createObjectStore(STORES.locations, { keyPath: "id" });
        store.createIndex("name", "name", { unique: false });
      }

      // ----------------
      // attendance
      // ----------------
      if (!db.objectStoreNames.contains(STORES.attendance)) {
        const store = db.createObjectStore(STORES.attendance, { keyPath: "id" });
        store.createIndex("totoId", "totoId", { unique: false });
        store.createIndex("date", "date", { unique: false });
      }

      // ----------------
      // trips
      // ----------------
      if (!db.objectStoreNames.contains(STORES.trips)) {
        const store = db.createObjectStore(STORES.trips, { keyPath: "id" });
        store.createIndex("totoId", "totoId", { unique: false });
        store.createIndex("date", "date", { unique: false });
      }

      // ----------------
      // expenses
      // ----------------
      if (!db.objectStoreNames.contains(STORES.expenses)) {
        const store = db.createObjectStore(STORES.expenses, { keyPath: "id" });
        store.createIndex("totoId", "totoId", { unique: false });
        store.createIndex("date", "date", { unique: false });
        store.createIndex("category", "category", { unique: false });
      }
    };
  });
}

// ------------------------------------
// Internal helper
// ------------------------------------
function getStore(storeName, mode = "readonly") {
  return _db.transaction(storeName, mode).objectStore(storeName);
}

// ------------------------------------
// ID helper
// ------------------------------------
export function generateId() {
  if (crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ------------------------------------
// Generic CRUD
// ------------------------------------
export async function addItem(storeName, data) {
  await openDB();

  return new Promise((resolve, reject) => {
    const store = getStore(storeName, "readwrite");
    const req = store.add(data);

    req.onsuccess = () => resolve(true);
    req.onerror = () => reject("Add failed");
  });
}

export async function putItem(storeName, data) {
  await openDB();

  return new Promise((resolve, reject) => {
    const store = getStore(storeName, "readwrite");
    const req = store.put(data);

    req.onsuccess = () => resolve(true);
    req.onerror = () => reject("Update failed");
  });
}

export async function getAll(storeName) {
  await openDB();

  return new Promise((resolve, reject) => {
    const store = getStore(storeName);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject("Read failed");
  });
}

export async function getById(storeName, id) {
  await openDB();

  return new Promise((resolve, reject) => {
    const store = getStore(storeName);
    const req = store.get(id);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject("Get failed");
  });
}

export async function deleteById(storeName, id) {
  await openDB();

  return new Promise((resolve, reject) => {
    const store = getStore(storeName, "readwrite");
    const req = store.delete(id);

    req.onsuccess = () => resolve(true);
    req.onerror = () => reject("Delete failed");
  });
}

// ------------------------------------
// Attendance helpers
// ------------------------------------
export async function getAttendanceByTotoAndDate(totoId, date) {
  await openDB();

  return new Promise((resolve, reject) => {
    const store = getStore(STORES.attendance);
    const index = store.index("totoId");
    const req = index.getAll(totoId);

    req.onsuccess = () => {
      const list = req.result || [];
      resolve(list.find(a => a.date === date) || null);
    };

    req.onerror = () => reject("Attendance lookup failed");
  });
}

export async function getAttendanceByMonth(totoId, month) {
  await openDB();

  return new Promise((resolve, reject) => {
    const store = getStore(STORES.attendance);
    const index = store.index("totoId");
    const req = index.getAll(totoId);

    req.onsuccess = () => {
      const list = req.result || [];
      resolve(list.filter(a => a.date.startsWith(month)));
    };

    req.onerror = () => reject("Attendance month failed");
  });
}

// ------------------------------------
// Trips helpers
// ------------------------------------
export async function getTripsByMonth(totoId, month) {
  await openDB();

  return new Promise((resolve, reject) => {
    const store = getStore(STORES.trips);
    const index = store.index("totoId");
    const req = index.getAll(totoId);

    req.onsuccess = () => {
      const list = req.result || [];
      resolve(list.filter(t => t.date.startsWith(month)));
    };

    req.onerror = () => reject("Trips month failed");
  });
}

// ------------------------------------
// Expenses helpers
// ------------------------------------
export async function getExpensesByMonth(totoId, month) {
  await openDB();

  return new Promise((resolve, reject) => {
    const store = getStore(STORES.expenses);
    const index = store.index("totoId");
    const req = index.getAll(totoId);

    req.onsuccess = () => {
      const list = req.result || [];
      resolve(list.filter(e => e.date.startsWith(month)));
    };

    req.onerror = () => reject("Expenses month failed");
  });
}

// ------------------------------------
// ADMIN : delete one full day history
// attendance + trips + expenses
// ------------------------------------
export async function deleteHistoryByDate(date) {
  await openDB();

  const storeNames = [
    STORES.attendance,
    STORES.trips,
    STORES.expenses
  ];

  return new Promise((resolve, reject) => {
    const tx = _db.transaction(storeNames, "readwrite");

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject("Delete history failed");

    storeNames.forEach(name => {
      const store = tx.objectStore(name);
      const index = store.index("date");

      const req = index.openCursor(IDBKeyRange.only(date));

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    });
  });
}

// ------------------------------------
// ADMIN : delete toto completely
// (toto + attendance + trips + expenses)
// ------------------------------------
export async function deleteTotoCompletely(totoId) {
  await openDB();

  const storeNames = [
    STORES.totos,
    STORES.attendance,
    STORES.trips,
    STORES.expenses
  ];

  return new Promise((resolve, reject) => {
    const tx = _db.transaction(storeNames, "readwrite");

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject("Delete toto failed");

    // delete toto itself
    tx.objectStore(STORES.totos).delete(totoId);

    function deleteChildren(storeName) {
      const store = tx.objectStore(storeName);
      const index = store.index("totoId");
      const req = index.openCursor(IDBKeyRange.only(totoId));

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    }

    deleteChildren(STORES.attendance);
    deleteChildren(STORES.trips);
    deleteChildren(STORES.expenses);
  });
}
