/**
 * Слияние локальных и удалённых записей при синхронизации.
 *
 * Правила:
 * - новая запись с сервера добавляется локально;
 * - локальная запись, которая ещё не ушла на сервер (`pendingSync`), главнее;
 * - иначе побеждает более свежий `updatedAt`; без `updatedAt` локальное не трогаем.
 */
export interface Mergeable {
  id: string;
  updatedAt?: string;
  pendingSync?: boolean;
}

export interface MergeResult<T> {
  merged: T[];
  added: number;
  updated: number;
}

export function mergeById<T extends Mergeable>(local: T[], remote: T[]): MergeResult<T> {
  const byId = new Map<string, T>();
  for (const item of local) {
    if (item && typeof item.id === "string" && item.id !== "") byId.set(item.id, item);
  }

  let added = 0;
  let updated = 0;

  for (const item of remote) {
    if (!item || typeof item.id !== "string" || item.id === "") continue;
    const current = byId.get(item.id);

    if (!current) {
      byId.set(item.id, { ...item, pendingSync: false });
      added += 1;
      continue;
    }

    // Своя неотправленная правка не должна затираться сервером
    if (current.pendingSync) continue;

    if (item.updatedAt && current.updatedAt && item.updatedAt > current.updatedAt) {
      byId.set(item.id, { ...item, pendingSync: false });
      updated += 1;
    }
  }

  return { merged: [...byId.values()], added, updated };
}
