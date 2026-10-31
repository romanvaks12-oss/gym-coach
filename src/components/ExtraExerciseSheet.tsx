import { useMemo, useState } from "react";
import type { Exercise, MuscleGroup } from "../types";
import { MUSCLE_LABELS, MUSCLE_ORDER } from "../domain/catalog";
import { buildPlanItem, type PlanItem } from "../core/plan";
import type { PerformedSet } from "../core/progression";
import { formatKg } from "../core/validation";

/** Короткая строка рекомендации: «3 × 8–12 · 20 кг · RPE 8». */
export function recommendText(item: PlanItem): string {
  const range = item.repLow === item.repHigh ? `${item.repLow}` : `${item.repLow}–${item.repHigh}`;
  const unit = item.measure === "time" ? " с" : "";
  const weight = item.usesBodyweight
    ? "свой вес"
    : item.weight === null
      ? "подбери вес"
      : `${formatKg(item.weight)} кг`;
  return `${item.sets} × ${range}${unit} · ${weight} · RPE ${item.targetRpe}`;
}

/**
 * Выбор дополнительного упражнения в конце тренировки.
 *
 * Рекомендация считается тем же `buildPlanItem`, что и основной план, поэтому
 * подходы/повторы/вес подчиняются общей логике прогрессии.
 */
export default function ExtraExerciseSheet({
  exercises,
  usedIds,
  history,
  volumeMultiplier,
  onPick,
  onClose,
}: {
  exercises: Exercise[];
  usedIds: string[];
  history: PerformedSet[];
  volumeMultiplier: number;
  onPick: (item: PlanItem) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "all">("all");

  const available = useMemo(
    () => exercises.filter((ex) => !usedIds.includes(ex.id)),
    [exercises, usedIds],
  );

  const muscles = useMemo(() => {
    const present = new Set(available.map((ex) => ex.primaryMuscle));
    return MUSCLE_ORDER.filter((m) => present.has(m));
  }, [available]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return available
      .filter((ex) => muscle === "all" || ex.primaryMuscle === muscle)
      .filter((ex) => q === "" || ex.name.toLowerCase().includes(q))
      .map((exercise) => ({
        exercise,
        item: buildPlanItem({ exercise, history, volumeMultiplier }),
      }))
      .sort((a, b) => a.exercise.name.localeCompare(b.exercise.name, "ru"));
  }, [available, history, muscle, query, volumeMultiplier]);

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="Добавить упражнение">
      <button type="button" className="sheet__backdrop" onClick={onClose} aria-label="Закрыть" />
      <div className="sheet__panel">
        <header className="sheet__head">
          <div>
            <h2 className="sheet__title">Добавить упражнение</h2>
            <p className="hint">Рекомендация подстроена под твою историю и объём дня.</p>
          </div>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </header>

        <label className="field">
          <span className="field__label">Поиск</span>
          <input
            className="input"
            type="search"
            inputMode="search"
            autoComplete="off"
            placeholder="например, икры"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <div className="chips chips--wrap">
          <button
            type="button"
            className={muscle === "all" ? "chip chip--sm chip--active" : "chip chip--sm"}
            onClick={() => setMuscle("all")}
          >
            все
          </button>
          {muscles.map((m) => (
            <button
              key={m}
              type="button"
              className={muscle === m ? "chip chip--sm chip--active" : "chip chip--sm"}
              onClick={() => setMuscle(m)}
            >
              {MUSCLE_LABELS[m]}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="hint">Ничего не нашлось — попробуй другое слово или группу.</p>
        ) : (
          <ul className="extralist">
            {rows.map(({ exercise, item }) => (
              <li key={exercise.id}>
                <button type="button" className="extralist__row" onClick={() => onPick(item)}>
                  <span className="extralist__name">{exercise.name}</span>
                  <span className="extralist__meta">
                    {MUSCLE_LABELS[exercise.primaryMuscle]} · {recommendText(item)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
