import { useEffect, useMemo, useState } from "react";
import type { SetLog, Workout } from "../types";
import { byId } from "../domain/catalog";
import { db } from "../storage/db";
import { dayMonth } from "../core/analytics";

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function planLabel(planId?: string): string {
  if (planId?.includes("upper")) return "Верх";
  if (planId?.includes("lower")) return "Низ";
  if (planId?.includes("full")) return "Всё тело";
  return "Тренировка";
}

export function HistoryView({ workouts, sets }: { workouts: Workout[]; sets: SetLog[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const items = useMemo(() => {
    const sorted = [...workouts].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    return sorted.map((workout) => {
      const own = sets.filter((set) => set.workoutId === workout.id && !set.isWarmup);
      const tonnage = own.reduce((sum, set) => sum + set.weight * set.reps, 0);
      const byExercise = new Map<string, SetLog[]>();
      for (const set of own) {
        const list = byExercise.get(set.exerciseId) ?? [];
        list.push(set);
        byExercise.set(set.exerciseId, list);
      }
      const exercises = [...byExercise.entries()].map(([exerciseId, logs]) => ({
        exerciseId,
        name: byId(exerciseId)?.name ?? exerciseId,
        logs: [...logs].sort((a, b) => a.setIndex - b.setIndex),
      }));
      return { workout, sets: own, tonnage, exercises };
    });
  }, [workouts, sets]);

  if (items.length === 0) {
    return (
      <div className="screen">
        <h1 className="screen__title">История</h1>
        <section className="card">
          <h2 className="card__title">Пока пусто</h2>
          <p className="card__text">
            Заверши первую тренировку — здесь появится история по датам: упражнения, подходы, вес и
            тоннаж.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="screen">
      <h1 className="screen__title">История</h1>

      {items.map(({ workout, sets: own, tonnage, exercises }) => {
        const isOpen = expanded === workout.id;
        return (
          <section key={workout.id} className="card">
            <button
              type="button"
              className="history__header"
              onClick={() => setExpanded(isOpen ? null : workout.id)}
              aria-expanded={isOpen}
            >
              <span>
                <span className="history__date">
                  {dayMonth(workout.date)} · {formatTime(workout.createdAt)} · {workout.durationMin} мин
                </span>
                <span className="history__meta">
                  {planLabel(workout.planId)} · {own.length}{" "}
                  {own.length === 1 ? "подход" : own.length < 5 ? "подхода" : "подходов"} ·{" "}
                  {Math.round(tonnage)} кг
                </span>
              </span>
              <span className="history__chev" aria-hidden="true">
                {isOpen ? "▲" : "▼"}
              </span>
            </button>

            {isOpen && (
              <div className="history__body">
                {exercises.length === 0 ? (
                  <p className="hint">Рабочих подходов не записано.</p>
                ) : (
                  exercises.map((exercise) => (
                    <div key={exercise.exerciseId}>
                      <div className="history__exname">{exercise.name}</div>
                      <ul className="history__sets">
                        {exercise.logs.map((log) => (
                          <li key={log.id} className="history__setrow">
                            <span>
                              {log.setIndex}. {log.weight > 0 ? `${log.weight} кг` : "свой вес"} ×{" "}
                              {log.reps}
                            </span>
                            <span className="hint">RPE {log.rpe}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default function HistoryScreen() {
  const [data, setData] = useState<{ workouts: Workout[]; sets: SetLog[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([db.getAll<Workout>("workouts"), db.getAll<SetLog>("sets")])
      .then(([workouts, sets]) => setData({ workouts, sets }))
      .catch(() => setError("Не удалось открыть локальную базу"));
  }, []);

  if (error) {
    return (
      <div className="screen">
        <h1 className="screen__title">История</h1>
        <p className="notice notice--error">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="screen">
        <h1 className="screen__title">История</h1>
        <p className="card__text">Загружаю…</p>
      </div>
    );
  }

  return <HistoryView {...data} />;
}
