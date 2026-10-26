/**
 * Minimal IndexedDB wrapper — no dependencies.
 * Stores mirror the domain types. Data is the single source of truth for the UI;
 * Google Sheets is a durable mirror (see skill sheets-backend).
 */
import type { AppSettings, BodyMetric, SetLog, Workout } from "../types";
import { DEFAULT_SETTINGS } from "../types";

const DB_NAME = "gym-coach";
const DB_VERSION = 1;

export type StoreName = "workouts" | "sets" | "body" | "meta";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("workouts")) {
        db.createObjectStore("workouts", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("sets")) {
        const store = db.createObjectStore("sets", { keyPath: "id" });
        store.createIndex("byWorkout", "workoutId");
      }
      if (!db.objectStoreNames.contains("body")) {
        db.createObjectStore("body", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = run(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export const db = {
  getAll<T>(store: StoreName): Promise<T[]> {
    return tx<T[]>(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>);
  },
  put<T>(store: StoreName, value: T): Promise<IDBValidKey> {
    return tx<IDBValidKey>(store, "readwrite", (s) => s.put(value as never));
  },
  /** Для хранилищ с ключом вне записи (meta) */
  putKey<T>(store: StoreName, key: string, value: T): Promise<IDBValidKey> {
    return tx<IDBValidKey>(store, "readwrite", (s) => s.put(value as never, key));
  },
  /** Запись пачки в одной транзакции — быстрее, чем N отдельных put */
  putMany<T>(store: StoreName, values: T[]): Promise<void> {
    if (values.length === 0) return Promise.resolve();
    return openDb().then(
      (db) =>
        new Promise<void>((resolve, reject) => {
          const t = db.transaction(store, "readwrite");
          const s = t.objectStore(store);
          for (const value of values) s.put(value as never);
          t.oncomplete = () => resolve();
          t.onerror = () => reject(t.error);
        }),
    );
  },
  get<T>(store: StoreName, key: string): Promise<T | undefined> {
    return tx<T | undefined>(store, "readonly", (s) => s.get(key) as IDBRequest<T | undefined>);
  },
  remove(store: StoreName, key: string): Promise<undefined> {
    return tx<undefined>(store, "readwrite", (s) => s.delete(key) as IDBRequest<undefined>);
  },
};

const SETTINGS_KEY = "settings";

export async function loadSettings(): Promise<AppSettings> {
  const saved = await db.get<AppSettings>("meta", SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await db.putKey("meta", SETTINGS_KEY, settings);
}

export interface ExportPayload {
  exportedAt: string;
  schemaVersion: number;
  workouts: Workout[];
  sets: SetLog[];
  body: BodyMetric[];
}

export async function exportAll(): Promise<ExportPayload> {
  const [workouts, sets, body, settings] = await Promise.all([
    db.getAll<Workout>("workouts"),
    db.getAll<SetLog>("sets"),
    db.getAll<BodyMetric>("body"),
    loadSettings(),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: settings.schemaVersion,
    workouts,
    sets,
    body,
  };
}

export async function countAll(): Promise<{ workouts: number; sets: number; body: number }> {
  const [workouts, sets, body] = await Promise.all([
    db.getAll<Workout>("workouts"),
    db.getAll<SetLog>("sets"),
    db.getAll<BodyMetric>("body"),
  ]);
  return { workouts: workouts.length, sets: sets.length, body: body.length };
}
