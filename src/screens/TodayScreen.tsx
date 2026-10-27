import { useEffect, useState } from "react";
import type { ActiveSession, Brief, SetLog, Workout } from "../types";
import { EXERCISES } from "../domain/catalog";
import { buildPlans, type PlanOption } from "../core/plan";
import { computeReadiness, type ReadinessResult } from "../core/readiness";
import { nowIso, todayIso } from "../core/dates";
import { clearActiveSession, db, loadActiveSession, loadSettings, saveActiveSession } from "../storage/db";
import { isConfigured, syncNow } from "../storage/sync";
import { loadHistory, loadLastDay, saveLastDay } from "../storage/history";
import BriefForm from "./BriefForm";
import PlanPicker from "./PlanPicker";
import WorkoutRunner from "./WorkoutRunner";

type SyncNote =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "off" }
  | { kind: "ok"; total: number }
  | { kind: "error"; message: string };

type Step =
  | { kind: "brief" }
  | { kind: "plans"; plans: PlanOption[]; readiness: ReadinessResult; brief: Brief }
  | { kind: "workout"; plan: PlanOption; workoutId: string; startedAt: number; readiness: number; index: number; logs: SetLog[] }
  | {
      kind: "done";
      tonnage: number;
      sets: number;
      minutes: number;
      exerciseCount: number;
    };

export default function TodayScreen() {
  const [step, setStep] = useState<Step>({ kind: "brief" });
  const [busy, setBusy] = useState(false);
  const [sync, setSync] = useState<SyncNote>({ kind: "idle" });
  const [active, setActive] = useState<ActiveSession | null>(null);

  useEffect(() => {
    loadActiveSession().then(setActive).catch(() => setActive(null));
  }, []);

  /** Тихий синк после тренировки: никогда не блокирует сводку и не мешает сохранить данные. */
  async function trySync() {
    setSync({ kind: "sending" });
    try {
      const settings = await loadSettings();
      if (!isConfigured(settings)) {
        setSync({ kind: "off" });
        return;
      }
      const result = await syncNow(settings);
      if (result.ok) setSync({ kind: "ok", total: result.pushed + result.pulled });
      else setSync({ kind: "error", message: result.error ?? "не получилось" });
    } catch {
      setSync({ kind: "error", message: "сеть недоступна" });
    }
  }

  async function onBrief(brief: Brief) {
    setBusy(true);
    const today = todayIso();
    const readiness = computeReadiness(brief);
    const [history, lastDay] = await Promise.all([loadHistory(), loadLastDay(today)]);
    const plans = buildPlans({
      brief,
      readiness,
      history,
      exercises: EXERCISES,
      todayIso: today,
      lastDayType: lastDay?.dayType ?? null,
    });
    setBusy(false);
    setStep({ kind: "plans", plans, readiness, brief });
  }

  function onPick(plan: PlanOption, readiness: number) {
    const session: ActiveSession = {
      workoutId: crypto.randomUUID(),
      planId: plan.id,
      plan,
      startedAt: Date.now(),
      date: todayIso(),
      readiness,
      index: 0,
      logs: [],
    };
    void saveActiveSession(session);
    setActive(session);
    setStep({
      kind: "workout",
      plan,
      workoutId: session.workoutId,
      startedAt: session.startedAt,
      readiness,
      index: 0,
      logs: [],
    });
  }

  function resumeActive() {
    if (!active) return;
    setStep({
      kind: "workout",
      plan: active.plan,
      workoutId: active.workoutId,
      startedAt: active.startedAt,
      readiness: active.readiness,
      index: active.index,
      logs: active.logs,
    });
  }

  async function cancelActive() {
    await clearActiveSession();
    setActive(null);
    setStep({ kind: "brief" });
  }

  async function onFinish(
    logs: SetLog[],
    durationMin: number,
    plan: PlanOption,
    workoutId: string,
    readiness: number,
  ) {
    const timestamp = nowIso();
    const workout: Workout = {
      id: workoutId,
      date: todayIso(),
      readiness,
      durationMin,
      planId: plan.id,
      createdAt: timestamp,
      updatedAt: timestamp,
      pendingSync: true,
    };

    await db.put("workouts", workout);
    for (const log of logs) {
      await db.put("sets", log);
    }
    if (plan.bodyWeightKg) {
      await db.put("body", {
        id: `${workout.date}-weight`,
        date: workout.date,
        weightKg: plan.bodyWeightKg,
        createdAt: timestamp,
        pendingSync: true,
      });
    }
    await saveLastDay(plan.dayType, workout.date);
    await clearActiveSession();
    setActive(null);

    const tonnage = logs.reduce((sum, l) => sum + l.weight * l.reps, 0);
    setStep({
      kind: "done",
      tonnage,
      sets: logs.length,
      minutes: durationMin,
      exerciseCount: new Set(logs.map((l) => l.exerciseId)).size,
    });
    void trySync();
  }

  if (busy) {
    return (
      <div className="screen">
        <p className="card__text">Считаю план…</p>
      </div>
    );
  }

  if (step.kind === "brief") {
    return (
      <>
        {active && (
          <div className="screen">
            <h1 className="screen__title">Сегодня</h1>
            <section className="card card--rest">
              <h2 className="card__title">Тренировка в процессе</h2>
              <p className="card__text">
                Начата в {new Date(active.startedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
              </p>
              <button type="button" className="button" onClick={resumeActive}>
                Продолжить тренировку
              </button>
              <button type="button" className="button button--ghost" onClick={() => void cancelActive()}>
                Отменить тренировку
              </button>
            </section>
          </div>
        )}
        {!active && <BriefForm onDone={onBrief} />}
      </>
    );
  }

  if (step.kind === "plans") {
    return (
      <PlanPicker
        plans={step.plans}
        readiness={step.readiness}
        onPick={(plan) => onPick(plan, step.readiness.score)}
        onBack={() => setStep({ kind: "brief" })}
      />
    );
  }

  if (step.kind === "workout") {
    return (
      <WorkoutRunner
        plan={step.plan}
        exercises={EXERCISES}
        workoutId={step.workoutId}
        startedAt={step.startedAt}
        initialIndex={step.index}
        initialLogs={step.logs}
        onProgress={(index, logs) => {
          if (!active) return;
          const updated: ActiveSession = { ...active, index, logs };
          setActive(updated);
          void saveActiveSession(updated);
        }}
        onFinish={(logs, minutes) =>
          onFinish(logs, minutes, step.plan, step.workoutId, step.readiness)
        }
        onCancel={() => {
          void clearActiveSession();
          setActive(null);
          setStep({ kind: "brief" });
        }}
      />
    );
  }

  return (
    <div className="screen">
      <h1 className="screen__title">Тренировка записана</h1>
      <section className="card">
        <div className="stats">
          <div className="stat">
            <span className="stat__value">{Math.round(step.tonnage)}</span>
            <span className="stat__label">кг тоннажа</span>
          </div>
          <div className="stat">
            <span className="stat__value">{step.sets}</span>
            <span className="stat__label">подходов</span>
          </div>
          <div className="stat">
            <span className="stat__value">{step.exerciseCount}</span>
            <span className="stat__label">упражнений</span>
          </div>
          <div className="stat">
            <span className="stat__value">{step.minutes}</span>
            <span className="stat__label">минут</span>
          </div>
        </div>
      </section>
      <p
        className={
          sync.kind === "error"
            ? "notice notice--warn"
            : sync.kind === "ok"
              ? "notice notice--ok"
              : "hint"
        }
      >
        {sync.kind === "ok"
          ? `Данные в локальной базе и в Google Sheets (${sync.total} записей).`
          : sync.kind === "sending"
            ? "Данные в локальной базе. Отправляю в таблицу…"
            : sync.kind === "error"
              ? `Данные в локальной базе, в таблицу не ушли: ${sync.message}. Отправим позже.`
              : "Данные в локальной базе. Синк с Google Sheets не настроен — включается в «Настройках»."}
      </p>
      {sync.kind === "error" && (
        <button type="button" className="button button--ghost" onClick={() => void trySync()}>
          Отправить ещё раз
        </button>
      )}
      <button
        type="button"
        className="button"
        onClick={() => {
          setSync({ kind: "idle" });
          setStep({ kind: "brief" });
        }}
      >
        Заполнить бриф заново
      </button>
    </div>
  );
}
