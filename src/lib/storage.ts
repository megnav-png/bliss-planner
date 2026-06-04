import { AppState } from "./types";
import { loadPlannerStateFromDb, savePlannerStateToDb } from "./localDatabase";

const STORAGE_KEY = "wovops.phase2.state";

export function loadState<T>(fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveState<T>(state: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    void savePlannerStateToDb(state);
  } catch {
    // silent fail; local draft remains available in-memory
  }
}

export async function loadPersistedState<T>(fallback: T): Promise<T> {
  const fastState = loadState<T>(fallback);
  const dbState = await loadPlannerStateFromDb<T>();
  if (dbState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dbState));
    } catch {
      // keep IndexedDB as the durable source if localStorage is blocked
    }
    return dbState;
  }
  void savePlannerStateToDb(fastState);
  return fastState;
}
