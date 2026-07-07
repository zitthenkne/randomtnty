const DB_NAME = "wheel_spinner_library_v1";
const STORE_NAME = "wheels";
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("name", "name", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
        store.createIndex("pinned", "pinned", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function runTx(mode, callback) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = callback(store);
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("IndexedDB transaction failed"));
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error("IndexedDB transaction aborted"));
    };
  });
}

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `wheel-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export async function saveWheel({ id, name, config, pinned = false }) {
  const wheel = {
    id: id || makeId(),
    name: (name || "Untitled Wheel").trim() || "Untitled Wheel",
    config,
    entryCount: Array.isArray(config?.entries) ? config.entries.length : 0,
    pinned: Boolean(pinned),
    updatedAt: Date.now(),
    createdAt: Date.now()
  };

  const existing = id ? await getWheel(id) : null;
  if (existing) {
    wheel.createdAt = existing.createdAt || wheel.createdAt;
    wheel.pinned = typeof pinned === "boolean" ? pinned : Boolean(existing.pinned);
  }

  await runTx("readwrite", (store) => {
    store.put(wheel);
  });
  return wheel;
}

export async function listWheels() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onerror = () => {
      db.close();
      reject(request.error || new Error("Failed to list wheels"));
    };
    request.onsuccess = () => {
      const wheels = request.result || [];
      wheels.sort((a, b) => {
        if (Boolean(b.pinned) !== Boolean(a.pinned)) {
          return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
        }
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
      db.close();
      resolve(wheels);
    };
  });
}

export async function getWheel(id) {
  if (!id) return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onerror = () => {
      db.close();
      reject(request.error || new Error("Failed to get wheel"));
    };
    request.onsuccess = () => {
      db.close();
      resolve(request.result || null);
    };
  });
}

export async function deleteWheel(id) {
  if (!id) return;
  await runTx("readwrite", (store) => {
    store.delete(id);
  });
}

export async function renameWheel(id, name) {
  const wheel = await getWheel(id);
  if (!wheel) return null;
  wheel.name = (name || wheel.name).trim() || wheel.name;
  wheel.updatedAt = Date.now();
  await runTx("readwrite", (store) => {
    store.put(wheel);
  });
  return wheel;
}

export async function duplicateWheel(id) {
  const wheel = await getWheel(id);
  if (!wheel) return null;
  const copy = {
    ...wheel,
    id: makeId(),
    name: `${wheel.name} (Copy)`,
    updatedAt: Date.now(),
    createdAt: Date.now(),
    pinned: false
  };
  await runTx("readwrite", (store) => {
    store.put(copy);
  });
  return copy;
}

export async function togglePinned(id, pinned) {
  const wheel = await getWheel(id);
  if (!wheel) return null;
  wheel.pinned = Boolean(pinned);
  wheel.updatedAt = Date.now();
  await runTx("readwrite", (store) => {
    store.put(wheel);
  });
  return wheel;
}

export async function clearLibrary() {
  await runTx("readwrite", (store) => {
    store.clear();
  });
}
