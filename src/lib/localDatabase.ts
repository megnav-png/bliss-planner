const DB_NAME = "bliss-planner-local";
const DB_VERSION = 1;
const STORE_NAME = "kv";
const STATE_KEY = "planner-state";

type StoredValue<T> = {
  key: string;
  value: T;
  updatedAt: string;
};

function canUseIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDb(): Promise<IDBDatabase | null> {
  if (!canUseIndexedDb()) return Promise.resolve(null);

  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

export async function savePlannerStateToDb<T>(value: T): Promise<void> {
  const db = await openDb();
  if (!db) return;

  await new Promise<void>((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const payload: StoredValue<T> = {
      key: STATE_KEY,
      value,
      updatedAt: new Date().toISOString()
    };
    store.put(payload);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });

  db.close();
}

export async function loadPlannerStateFromDb<T>(): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;

  const value = await new Promise<T | null>((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(STATE_KEY);
    request.onsuccess = () => {
      const result = request.result as StoredValue<T> | undefined;
      resolve(result?.value ?? null);
    };
    request.onerror = () => resolve(null);
    transaction.onerror = () => resolve(null);
  });

  db.close();
  return value;
}

export async function clearPlannerLocalDb(): Promise<void> {
  const db = await openDb();
  if (!db) return;

  await new Promise<void>((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(STATE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });

  db.close();
}
