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
