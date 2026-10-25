import { useState } from "react";
import type { Brief, SetLog, Workout } from "../types";
import { EXERCISES } from "../domain/catalog";
import { buildPlans, type PlanOption } from "../core/plan";
import { computeReadiness, type ReadinessResult } from "../core/readiness";
import { nowIso, todayIso } from "../core/dates";
import { db } from "../storage/db";
import { loadHistory } from "../storage/history";
import BriefForm from "./BriefForm";
import PlanPicker from "./PlanPicker";
import WorkoutRunner from "./WorkoutRunner";

type Step =
  | { kind: "brief" }
  | { kind: "plans"; plans: PlanOption[]; readiness: ReadinessResult; brief: Brief }
  | { kind: "workout"; plan: PlanOption; workoutId: string; startedAt: number; readiness: number }
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

  async function onBrief(brief: Brief) {
    setBusy(true);
    const readiness = computeReadiness(brief);
    const history = await loadHistory();
    const plans = buildPlans({
      brief,
      readiness,
      history,
      exercises: EXERCISES,
      todayIso: todayIso(),
    });
    setBusy(false);
    setStep({ kind: "plans", plans, readiness, brief });
  }

  function onPick(plan: PlanOption, readiness: number) {
    setStep({
      kind: "workout",
      plan,
      workoutId: crypto.randomUUID(),
      startedAt: Date.now(),
      readiness,
    });
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

    const tonnage = logs.reduce((sum, l) => sum + l.weight * l.reps, 0);
    setStep({
      kind: "done",
      tonnage,
      sets: logs.length,
      minutes: durationMin,
      exerciseCount: new Set(logs.map((l) => l.exerciseId)).size,
    });
  }

  if (busy) {
    return (
      <div className="screen">
        <p className="card__text">Считаю план…</p>
      </div>
    );
  }

  if (step.kind === "brief") {
    return <BriefForm onDone={onBrief} />;
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
        onFinish={(logs, minutes) =>
          onFinish(logs, minutes, step.plan, step.workoutId, step.readiness)
        }
        onCancel={() => setStep({ kind: "brief" })}
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
      <p className="hint">
        Данные уже в локальной базе. Синхронизация с Google Sheets появится в следующей фазе.
      </p>
      <button type="button" className="button" onClick={() => setStep({ kind: "brief" })}>
        Заполнить бриф заново
      </button>
    </div>
  );
}
