import { daysBetween, type DayType } from "../core/plan";
import type { PerformedSet } from "../core/progression";
import type { SetLog, Workout } from "../types";
import { db } from "./db";

/** Плоская история рабочих подходов: упражнение + вес/повторы/RPE + дата тренировки. */
export async function loadHistory(): Promise<PerformedSet[]> {
  const [sets, workouts] = await Promise.all([
    db.getAll<SetLog>("sets"),
    db.getAll<Workout>("workouts"),
  ]);
  const dateById = new Map(workouts.map((w) => [w.id, w.date]));
  const history: PerformedSet[] = [];

  for (const set of sets) {
    if (set.isWarmup) continue;
    const date = dateById.get(set.workoutId);
    if (!date) continue;
    history.push({
      exerciseId: set.exerciseId,
      weight: set.weight,
      reps: set.reps,
      rpe: set.rpe,
      date,
    });
  }
  return history;
}

const LAST_DAY_KEY = "lastDay";

export interface LastDay {
  dayType: DayType;
  date: string;
}

/** Тип прошлой тренировки — для ротации «верх/низ» без повторов подряд. */
export async function loadLastDay(todayIso: string): Promise<LastDay | null> {
  const saved = await db.get<LastDay>("meta", LAST_DAY_KEY);
  if (!saved?.dayType) return null;
  // Дольше трёх дней паузы — ротация уже не важна, начинаем заново.
  return daysBetween(saved.date, todayIso) <= 3 ? saved : null;
}

export async function saveLastDay(dayType: DayType, date: string): Promise<void> {
  await db.putKey("meta", LAST_DAY_KEY, { dayType, date });
}
