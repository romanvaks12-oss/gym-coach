/**
 * Синхронизация с Google Sheets через Apps Script Web App.
 *
 * Правила:
 * - IndexedDB остаётся источником истины; сеть никогда не блокирует тренировку;
 * - сначала отправляем неотправленное (`pendingSync`), потом забираем серверное;
 * - слияние — `mergeById`, локальные неотправленные записи главнее;
 * - токен и URL живут только в localStorage телефона, в репозиторий не попадают.
 */
import { mergeById } from "../core/merge";
import type { AppSettings, BodyMetric, SetLog, Workout } from "../types";
import { db, saveSettings } from "./db";

const TIMEOUT_MS = 20_000;

export interface SyncResult {
  ok: boolean;
  pushed: number;
  pulled: number;
  at?: string;
  error?: string;
}

export interface PingResult {
  ok: boolean;
  error?: string;
}

const str = (value: unknown): string => (typeof value === "string" ? value : "");

const bool = (value: unknown): boolean =>
  value === true || value === "TRUE" || value === "true" || value === "1";

/** Число из ячейки: число, "82,5", "82.5". null — если это не число. */
const maybeNum = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const numOr = (value: unknown, fallback: number): number => maybeNum(value) ?? fallback;

const isoDate = (value: unknown): string => {
  const text = str(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
};

export function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function isConfigured(settings: AppSettings): boolean {
  const url = normalizeUrl(settings.syncUrl);
  return /^https:\/\/script\.google\.com\/macros\/s\/.+\/(exec|dev)$/.test(url) && settings.syncToken.trim().length > 0;
}

function errorText(payload: Record<string, unknown>): string {
  const code = str(payload.error);
  if (code === "forbidden") return "Неверный токен — проверь значение в Code.gs и в приложении";
  if (code === "token_not_configured") return "В Apps Script не задан TOKEN";
  if (code === "unknown_action") return "Сервер не понял запрос — обнови Code.gs и деплой";
  return code || "Сервер вернул ошибку";
}

async function call(url: string, init: RequestInit): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // text/plain — чтобы Apps Script не устраивал CORS-preflight
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: "follow",
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Сервер ответил ${response.status}`);
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error("Ответ не JSON — проверь, что URL заканчивается на /exec и доступ «Anyone»");
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Сервер не ответил за 20 секунд");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

/* ---------- разбор строк из таблицы ---------- */

export function parseWorkoutRow(raw: unknown): Workout | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = str(row.id);
  const date = isoDate(row.date);
  if (!id || !date) return null;
  const createdAt = str(row.createdAt) || `${date}T00:00:00.000Z`;
  const readiness = numOr(row.readiness, 0);
  const durationMin = numOr(row.durationMin, 0);
  return {
    id,
    date,
    readiness: Math.min(100, Math.max(0, readiness)),
    durationMin: Math.max(0, durationMin),
    planId: str(row.planId) || undefined,
    notes: str(row.notes) || undefined,
    createdAt,
    updatedAt: str(row.updatedAt) || createdAt,
    pendingSync: false,
  };
}

export function parseSetRow(raw: unknown): SetLog | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = str(row.id);
  const workoutId = str(row.workoutId);
  const exerciseId = str(row.exerciseId);
  if (!id || !workoutId || !exerciseId) return null;

  // Вес 0 — законный (своё тело), а вот пустая или битая ячейка — нет
  const weight = maybeNum(row.weight);
  const reps = maybeNum(row.reps);
  if (weight === null || weight < 0 || weight > 400) return null;
  if (reps === null || reps < 1 || reps > 1800) return null;

  const rpe = maybeNum(row.rpe);
  return {
    id,
    workoutId,
    exerciseId,
    setIndex: Math.max(1, Math.round(numOr(row.setIndex, 1))),
    weight,
    reps: Math.round(reps),
    rpe: rpe === null ? 8 : Math.min(10, Math.max(1, Math.round(rpe))),
    isWarmup: bool(row.isWarmup),
    createdAt: str(row.createdAt) || new Date().toISOString(),
    pendingSync: false,
  };
}

export function parseBodyRow(raw: unknown): BodyMetric | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const date = isoDate(row.date);
  const weightKg = maybeNum(row.weightKg);
  if (!date || weightKg === null || weightKg < 20 || weightKg > 400) return null;
  const waist = maybeNum(row.waistCm);
  return {
    id: str(row.id) || `${date}-weight`,
    date,
    weightKg,
    waistCm: waist !== null && waist > 0 ? waist : undefined,
    createdAt: str(row.createdAt) || `${date}T00:00:00.000Z`,
    pendingSync: false,
  };
}

/* ---------- запросы ---------- */

export async function pendingCount(): Promise<number> {
  const [workouts, sets, body] = await Promise.all([
    db.getAll<Workout>("workouts"),
    db.getAll<SetLog>("sets"),
    db.getAll<BodyMetric>("body"),
  ]);
  return (
    workouts.filter((item) => item.pendingSync).length +
    sets.filter((item) => item.pendingSync).length +
    body.filter((item) => item.pendingSync).length
  );
}

export async function testConnection(settings: AppSettings): Promise<PingResult> {
  const url = normalizeUrl(settings.syncUrl);
  if (!isConfigured(settings)) return { ok: false, error: "Сначала заполни URL и токен" };
  try {
    const payload = await call(
      `${url}?action=ping&token=${encodeURIComponent(settings.syncToken.trim())}`,
      { method: "GET" },
    );
    if (!payload.ok) return { ok: false, error: errorText(payload) };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Сеть недоступна" };
  }
}

export interface PullResult {
  ok: boolean;
  workouts: number;
  sets: number;
  body: number;
  at?: string;
  error?: string;
}

/**
 * Забрать всё из таблицы и **заменить** локальные данные.
 *
 * Нужно, когда локальная база пустая (новый телефон) или засорена тестовыми
 * записями: сервер в этом случае считается истиной. Защита от пустого ответа:
 * если в таблице нет ни одной тренировки, локальное не трогаем.
 */
export async function pullReplace(settings: AppSettings): Promise<PullResult> {
  const url = normalizeUrl(settings.syncUrl);
  const token = settings.syncToken.trim();
  if (!isConfigured(settings)) {
    return { ok: false, workouts: 0, sets: 0, body: 0, error: "Сначала заполни URL и токен" };
  }

  try {
    const response = await call(`${url}?action=pull&token=${encodeURIComponent(token)}`, {
      method: "GET",
    });
    if (!response.ok) {
      return { ok: false, workouts: 0, sets: 0, body: 0, error: errorText(response) };
    }

    const data = (response.data ?? {}) as Record<string, unknown>;
    const rawWorkouts = Array.isArray(data.workouts) ? data.workouts : [];
    const rawSets = Array.isArray(data.sets) ? data.sets : [];
    const rawBody = Array.isArray(data.body) ? data.body : [];

    const workouts = rawWorkouts
      .map(parseWorkoutRow)
      .filter((x): x is Workout => x !== null);
    const workoutIds = new Set(workouts.map((item) => item.id));
    const sets = rawSets
      .map(parseSetRow)
      .filter((x): x is SetLog => x !== null && workoutIds.has(x.workoutId));
    const body = rawBody.map(parseBodyRow).filter((x): x is BodyMetric => x !== null);

    if (workouts.length === 0 && sets.length === 0 && body.length === 0) {
      return {
        ok: false,
        workouts: 0,
        sets: 0,
        body: 0,
        error: "В таблице пусто — локальные данные не тронул",
      };
    }

    await Promise.all([db.clear("workouts"), db.clear("sets"), db.clear("body")]);
    await Promise.all([
      db.putMany("workouts", workouts),
      db.putMany("sets", sets),
      db.putMany("body", body),
    ]);

    const at = str(response.serverTime) || new Date().toISOString();
    await saveSettings({ ...settings, lastSync: at });

    return { ok: true, workouts: workouts.length, sets: sets.length, body: body.length, at };
  } catch (error) {
    return {
      ok: false,
      workouts: 0,
      sets: 0,
      body: 0,
      error: error instanceof Error ? error.message : "Сеть недоступна",
    };
  }
}

export async function syncNow(settings: AppSettings): Promise<SyncResult> {
  const url = normalizeUrl(settings.syncUrl);
  const token = settings.syncToken.trim();
  if (!isConfigured(settings)) {
    return { ok: false, pushed: 0, pulled: 0, error: "Сначала заполни URL и токен" };
  }

  try {
    const [allWorkouts, allSets, allBody] = await Promise.all([
      db.getAll<Workout>("workouts"),
      db.getAll<SetLog>("sets"),
      db.getAll<BodyMetric>("body"),
    ]);

    const pendingWorkouts = allWorkouts.filter((item) => item.pendingSync);
    const pendingSets = allSets.filter((item) => item.pendingSync);
    const pendingBody = allBody.filter((item) => item.pendingSync);
    const pushed = pendingWorkouts.length + pendingSets.length + pendingBody.length;

    if (pushed > 0) {
      const response = await call(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          token,
          action: "push",
          data: { workouts: pendingWorkouts, sets: pendingSets, body: pendingBody },
        }),
      });
      if (!response.ok) {
        return { ok: false, pushed: 0, pulled: 0, error: errorText(response) };
      }
      await Promise.all([
        db.putMany(
          "workouts",
          pendingWorkouts.map((item) => ({ ...item, pendingSync: false })),
        ),
        db.putMany(
          "sets",
          pendingSets.map((item) => ({ ...item, pendingSync: false })),
        ),
        db.putMany(
          "body",
          pendingBody.map((item) => ({ ...item, pendingSync: false })),
        ),
      ]);
    }

    const response = await call(
      `${url}?action=pull&token=${encodeURIComponent(token)}`,
      { method: "GET" },
    );
    if (!response.ok) {
      return {
        ok: false,
        pushed,
        pulled: 0,
        error: `Отправлено, но прочитать не удалось: ${errorText(response)}`,
      };
    }

    const data = (response.data ?? {}) as Record<string, unknown>;
    const remoteWorkouts = Array.isArray(data.workouts) ? data.workouts : [];
    const remoteSets = Array.isArray(data.sets) ? data.sets : [];
    const remoteBody = Array.isArray(data.body) ? data.body : [];

    // После успешной отправки своих «грязных» записей больше нет
    const localWorkouts = allWorkouts.map((item) => ({ ...item, pendingSync: false }));
    const localSets = allSets.map((item) => ({ ...item, pendingSync: false }));
    const localBody = allBody.map((item) => ({ ...item, pendingSync: false }));

    const mergedWorkouts = mergeById(localWorkouts, remoteWorkouts.map(parseWorkoutRow).filter((x): x is Workout => x !== null));
    const mergedSets = mergeById(localSets, remoteSets.map(parseSetRow).filter((x): x is SetLog => x !== null));
    const mergedBody = mergeById(localBody, remoteBody.map(parseBodyRow).filter((x): x is BodyMetric => x !== null));

    await Promise.all([
      db.putMany("workouts", mergedWorkouts.merged),
      db.putMany("sets", mergedSets.merged),
      db.putMany("body", mergedBody.merged),
    ]);

    const pulled =
      mergedWorkouts.added +
      mergedWorkouts.updated +
      mergedSets.added +
      mergedSets.updated +
      mergedBody.added +
      mergedBody.updated;

    const at = str(response.serverTime) || new Date().toISOString();
    await saveSettings({ ...settings, lastSync: at });

    return { ok: true, pushed, pulled, at };
  } catch (error) {
    return {
      ok: false,
      pushed: 0,
      pulled: 0,
      error: error instanceof Error ? error.message : "Сеть недоступна",
    };
  }
}
