import { useEffect, useMemo, useState } from "react";
import type { PlanOption } from "../core/plan";
import { nowIso } from "../core/dates";
import type { Exercise, SetLog } from "../types";
import ExerciseSheet from "../components/ExerciseSheet";

const RPE_CHOICES = [6, 7, 8, 9, 10];

export default function WorkoutRunner({
  plan,
  exercises,
  workoutId,
  startedAt,
  onFinish,
  onCancel,
}: {
  plan: PlanOption;
  exercises: Exercise[];
  workoutId: string;
  startedAt: number;
  onFinish: (logs: SetLog[], durationMin: number) => void;
  onCancel: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [logs, setLogs] = useState<SetLog[]>([]);
  const [weight, setWeight] = useState("");
  const [extraWeight, setExtraWeight] = useState("");
  const [reps, setReps] = useState("");
  const [rpe, setRpe] = useState(8);
  const [restLeft, setRestLeft] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const item = plan.items[index];
  const exercise = useMemo(
    () => exercises.find((e) => e.id === item?.exerciseId),
    [exercises, item?.exerciseId],
  );

  const isTime = item?.measure === "time";
  const isBodyweight = Boolean(item?.usesBodyweight);
  const bodyWeight = plan.bodyWeightKg;

  useEffect(() => {
    if (!item) return;
    setWeight(item.weight === null ? "" : String(item.weight));
    setExtraWeight("");
    setReps(String(item.repTarget));
    setRpe(item.targetRpe);
  }, [item]);

  useEffect(() => {
    if (restLeft === null) return;
    if (restLeft <= 0) {
      setRestLeft(null);
      return;
    }
    const timer = window.setTimeout(() => setRestLeft((v) => (v === null ? null : v - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [restLeft]);

  if (!item || !exercise) {
    return (
      <div className="screen">
        <p className="card__text">План пуст — нечего показывать.</p>
        <button type="button" className="button button--ghost" onClick={onCancel}>
          Назад
        </button>
      </div>
    );
  }

  const doneSets = logs.filter((l) => l.exerciseId === item.exerciseId).length;
  const isLast = index === plan.items.length - 1;

  function addSet() {
    const numericReps = Number(reps);
    if (!Number.isFinite(numericReps) || numericReps <= 0) return;

    const extra = Number(extraWeight.replace(",", "."));
    const entered = Number(weight.replace(",", "."));
    const base = isBodyweight ? (bodyWeight ?? 0) + (Number.isFinite(extra) ? extra : 0) : entered;

    const log: SetLog = {
      id: crypto.randomUUID(),
      workoutId,
      exerciseId: item.exerciseId,
      setIndex: doneSets + 1,
      weight: isBodyweight ? base : Number.isFinite(base) ? base : 0,
      reps: numericReps,
      rpe,
      isWarmup: false,
      createdAt: nowIso(),
      pendingSync: true,
    };
    setLogs((prev) => [...prev, log]);
    setRestLeft(item.restSec);
  }

  function next() {
    if (isLast) {
      const durationMin = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
      onFinish(logs, durationMin);
      return;
    }
    setRestLeft(null);
    setIndex((i) => i + 1);
  }

  return (
    <div className="screen">
      <div className="runner__top">
        <span className="hint">
          Упражнение {index + 1} из {plan.items.length} · {plan.title}
        </span>
        <button type="button" className="linkbtn" onClick={onCancel}>
          прервать
        </button>
      </div>

      <h1 className="screen__title">{item.name}</h1>

      <section className="card">
        <div className="runner__target">
          <div>
            <span className="hint">Цель</span>
            <div className="runner__goal">
              {item.sets} × {item.repLow}–{item.repHigh}
              {isTime ? " с" : ""}
            </div>
          </div>
          <div>
            <span className="hint">Вес</span>
            <div className="runner__goal">
              {isBodyweight
                ? bodyWeight
                  ? `свой ${bodyWeight} кг`
                  : "свой вес"
                : item.weight === null
                  ? "подбери"
                  : `${item.weight} кг`}
            </div>
          </div>
          <div>
            <span className="hint">RPE</span>
            <div className="runner__goal">{item.targetRpe}</div>
          </div>
        </div>
        <p className="hint">{item.reason}</p>
        <button type="button" className="button button--ghost" onClick={() => setSheetOpen(true)}>
          Как делать и что работает
        </button>
      </section>

      {restLeft !== null && (
        <section className="card card--rest">
          <div className="rest__row">
            <span className="rest__time">{restLeft} c</span>
            <span className="hint">отдых</span>
          </div>
          <div className="chips">
            <button
              type="button"
              className="chip"
              onClick={() => setRestLeft((v) => Math.max(0, (v ?? 15) - 15))}
            >
              −15 c
            </button>
            <button type="button" className="chip" onClick={() => setRestLeft(null)}>
              пропустить
            </button>
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="card__title">
          Подход {doneSets + 1}
          {doneSets >= item.sets ? " — норма выполнена" : ` из ${item.sets}`}
        </h2>

        {isBodyweight ? (
          <div className="row">
            <label className="field field--half">
              <span className="field__label">Свой вес</span>
              <input className="input" value={bodyWeight ? `${bodyWeight} кг` : "не указан"} readOnly />
            </label>
            <label className="field field--half">
              <span className="field__label">Доп. вес, кг</span>
              <input
                className="input"
                inputMode="decimal"
                placeholder="0"
                value={extraWeight}
                onChange={(e) => setExtraWeight(e.target.value)}
              />
            </label>
          </div>
        ) : (
          <label className="field">
            <span className="field__label">Вес снаряда, кг</span>
            <input
              className="input"
              inputMode="decimal"
              value={weight}
              placeholder="0"
              onChange={(e) => setWeight(e.target.value)}
            />
          </label>
        )}

        <label className="field">
          <span className="field__label">{isTime ? "Секунды" : "Повторы"}</span>
          <input
            className="input"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
          />
        </label>

        <div className="field">
          <span className="field__label">Насколько тяжело (1–10)</span>
          <div className="segmented">
            {RPE_CHOICES.map((value) => (
              <button
                key={value}
                type="button"
                className={rpe === value ? "seg segmented__item--active" : "seg"}
                onClick={() => setRpe(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <span className="hint">8 — ещё 2 повтора в запасе, 10 — последний на пределе</span>
        </div>

        <button type="button" className="button" onClick={addSet}>
          Записать подход
        </button>

        {doneSets > 0 && (
          <ul className="setlist">
            {logs
              .filter((l) => l.exerciseId === item.exerciseId)
              .map((l) => (
                <li key={l.id}>
                  <span>
                    {l.setIndex}. {l.weight > 0 ? `${l.weight} кг` : "свой вес"} × {l.reps}
                    {isTime ? " с" : ""}
                  </span>
                  <span className="hint">RPE {l.rpe}</span>
                </li>
              ))}
          </ul>
        )}
      </section>

      <button type="button" className={isLast ? "button" : "button button--ghost"} onClick={next}>
        {isLast ? "Завершить тренировку" : "Следующее упражнение →"}
      </button>

      {sheetOpen && <ExerciseSheet exercise={exercise} onClose={() => setSheetOpen(false)} />}
    </div>
  );
}
