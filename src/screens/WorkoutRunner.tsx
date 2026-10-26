import { useEffect, useMemo, useState } from "react";
import type { PlanOption } from "../core/plan";
import { nowIso } from "../core/dates";
import { checkSetInput, formatKg } from "../core/validation";
import type { Exercise, SetLog } from "../types";
import ExerciseSheet from "../components/ExerciseSheet";

const RPE_CHOICES = [6, 7, 8, 9, 10];

const toNumber = (value: string): number => {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return 0;
  return Number(trimmed);
};

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  /** Предупреждение уже показано — следующее нажатие записывает */
  const [confirmPending, setConfirmPending] = useState(false);

  const item = plan.items[index];
  const exercise = useMemo(
    () => exercises.find((e) => e.id === item?.exerciseId),
    [exercises, item?.exerciseId],
  );

  const isTime = item?.measure === "time";
  const isBodyweight = Boolean(item?.usesBodyweight);
  const bodyWeight = plan.bodyWeightKg;

  const ownLogs = useMemo(
    () => (item ? logs.filter((l) => l.exerciseId === item.exerciseId) : []),
    [logs, item],
  );
  const editingLog = editingId ? (logs.find((l) => l.id === editingId) ?? null) : null;

  function resetToPlan() {
    if (!item) return;
    setWeight(item.weight === null ? "" : String(item.weight));
    setExtraWeight("");
    setReps(String(item.repTarget));
    setRpe(item.targetRpe);
    setEditingId(null);
    setError(null);
    setWarning(null);
    setConfirmPending(false);
  }

  useEffect(() => {
    resetToPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const isLast = index === plan.items.length - 1;
  const nextSetNumber = ownLogs.length + 1;

  function clearNotices() {
    setError(null);
    setWarning(null);
    setConfirmPending(false);
  }

  function draft() {
    const extra = toNumber(extraWeight);
    const entered = toNumber(weight);
    const total = isBodyweight ? (bodyWeight ?? 0) + extra : entered;
    return { total, numericReps: toNumber(reps) };
  }

  function startEdit(log: SetLog) {
    setEditingId(log.id);
    if (isBodyweight) {
      const extra = bodyWeight ? Math.max(0, log.weight - bodyWeight) : log.weight;
      setExtraWeight(extra > 0 ? formatKg(extra) : "");
      setWeight("");
    } else {
      setWeight(formatKg(log.weight));
    }
    setReps(String(log.reps));
    setRpe(log.rpe);
    clearNotices();
  }

  function removeSet(id: string) {
    setLogs((prev) => {
      const remaining = prev.filter((l) => l.id !== id);
      let n = 0;
      return remaining.map((l) =>
        l.exerciseId === item.exerciseId ? { ...l, setIndex: (n += 1) } : l,
      );
    });
    if (editingId === id) resetToPlan();
  }

  function submit() {
    const { total, numericReps } = draft();
    const others = ownLogs.filter((l) => l.id !== editingId);
    const reference = others.length > 0 ? others[others.length - 1].weight : item.weight;

    const check = checkSetInput({
      weight: total,
      reps: numericReps,
      rpe,
      measure: item.measure,
      usesBodyweight: isBodyweight,
      referenceWeightKg: reference,
    });

    if (!check.ok) {
      setError(check.error);
      setWarning(null);
      setConfirmPending(false);
      return;
    }

    if (check.warning && !confirmPending) {
      setWarning(check.warning);
      setError(null);
      setConfirmPending(true);
      return;
    }

    if (editingId) {
      setLogs((prev) =>
        prev.map((l) => (l.id === editingId ? { ...l, weight: total, reps: numericReps, rpe } : l)),
      );
    } else {
      const log: SetLog = {
        id: crypto.randomUUID(),
        workoutId,
        exerciseId: item.exerciseId,
        setIndex: nextSetNumber,
        weight: total,
        reps: numericReps,
        rpe,
        isWarmup: false,
        createdAt: nowIso(),
        pendingSync: true,
      };
      setLogs((prev) => [...prev, log]);
      setRestLeft(item.restSec);
    }
    resetToPlan();
  }

  function next() {
    if (isLast) {
      const durationMin = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
      onFinish(logs, durationMin);
      return;
    }
    setRestLeft(null);
    setEditingId(null);
    setError(null);
    setWarning(null);
    setConfirmPending(false);
    setIndex((i) => i + 1);
  }

  const weightLabel = isBodyweight
    ? bodyWeight
      ? `свой ${formatKg(bodyWeight)} кг`
      : "свой вес"
    : item.weight === null
      ? "подбери"
      : `${formatKg(item.weight)} кг`;

  return (
    <div className="screen">
      <div className="runner__top">
        <span className="hint">
          Упражнение {index + 1} из {plan.items.length} · {plan.title}
        </span>
        <span className="runner__nav">
          {index > 0 && (
            <button
              type="button"
              className="linkbtn"
              onClick={() => {
                setRestLeft(null);
                setIndex((i) => Math.max(0, i - 1));
              }}
            >
              ← пред.
            </button>
          )}
          <button type="button" className="linkbtn" onClick={onCancel}>
            прервать
          </button>
        </span>
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
            <div className="runner__goal">{weightLabel}</div>
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
          {editingLog
            ? `Правка подхода ${editingLog.setIndex}`
            : ownLogs.length >= item.sets
              ? `Подход ${nextSetNumber} — норма выполнена`
              : `Подход ${nextSetNumber} из ${item.sets}`}
        </h2>

        {isBodyweight ? (
          <div className="row">
            <label className="field field--half">
              <span className="field__label">Свой вес</span>
              <input className="input" value={bodyWeight ? `${formatKg(bodyWeight)} кг` : "не указан"} readOnly />
            </label>
            <label className="field field--half">
              <span className="field__label">Доп. вес, кг</span>
              <input
                className="input"
                inputMode="decimal"
                placeholder="0"
                value={extraWeight}
                onChange={(e) => {
                  setExtraWeight(e.target.value);
                  clearNotices();
                }}
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
              onChange={(e) => {
                setWeight(e.target.value);
                clearNotices();
              }}
            />
          </label>
        )}

        <label className="field">
          <span className="field__label">{isTime ? "Секунды" : "Повторы"}</span>
          <input
            className="input"
            inputMode="numeric"
            value={reps}
            onChange={(e) => {
              setReps(e.target.value);
              clearNotices();
            }}
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
                onClick={() => {
                  setRpe(value);
                  clearNotices();
                }}
              >
                {value}
              </button>
            ))}
          </div>
          <span className="hint">8 — ещё 2 повтора в запасе, 10 — последний на пределе</span>
        </div>

        {error && <p className="notice notice--error">{error}</p>}
        {warning && <p className="notice notice--warn">{warning}</p>}

        <button type="button" className="button" onClick={submit}>
          {editingId
            ? "Сохранить изменения"
            : warning
              ? "Всё верно, записать"
              : "Записать подход"}
        </button>

        {editingId && (
          <div className="row">
            <button
              type="button"
              className="button button--ghost button--danger"
              onClick={() => removeSet(editingId)}
            >
              Удалить подход
            </button>
            <button type="button" className="button button--ghost" onClick={resetToPlan}>
              Отмена
            </button>
          </div>
        )}

        {ownLogs.length > 0 && (
          <ul className="setlist">
            {ownLogs.map((l) => (
              <li
                key={l.id}
                className={l.id === editingId ? "setlist__row setlist__row--editing" : "setlist__row"}
              >
                <span>
                  {l.setIndex}. {l.weight > 0 ? `${formatKg(l.weight)} кг` : "свой вес"} × {l.reps}
                  {isTime ? " с" : ""}
                  <span className="hint"> · RPE {l.rpe}</span>
                </span>
                <button type="button" className="mini" onClick={() => startEdit(l)}>
                  правка
                </button>
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
