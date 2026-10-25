/**
 * Страница предпросмотра для проверки вёрстки без кликов:
 * http://127.0.0.1:5173/preview.html
 *
 * Показывает план (сгенерированный на тестовых данных), экран тренировки
 * и карту мышц для нескольких групп. В прод-сборку не попадает.
 */
import { createRoot } from "react-dom/client";
import MuscleMap from "../components/MuscleMap";
import PlanPicker from "../screens/PlanPicker";
import WorkoutRunner from "../screens/WorkoutRunner";
import { buildPlans } from "../core/plan";
import { computeReadiness } from "../core/readiness";
import { EXERCISES } from "../domain/catalog";
import type { Brief } from "../types";
import "../styles.css";

const TODAY = "2026-10-26";

const brief: Brief = {
  sleep: 4,
  energy: 4,
  stress: 2,
  minutes: 60,
  soreness: {},
  bodyWeightKg: 78.4,
};

const readiness = computeReadiness(brief);
const plans = buildPlans({
  brief,
  readiness,
  history: [
    { exerciseId: "bb-bench-press", weight: 70, reps: 8, rpe: 8, date: "2026-10-23" },
    { exerciseId: "bb-row", weight: 60, reps: 10, rpe: 8, date: "2026-10-23" },
  ],
  exercises: EXERCISES,
  todayIso: TODAY,
  lastDayType: "upper",
});

createRoot(document.getElementById("root")!).render(
  <div style={{ width: 390, margin: "0 auto", display: "grid", gap: 16 }}>
    <div className="screen">
      <PlanPicker plans={plans} readiness={readiness} onPick={() => {}} onBack={() => {}} />
    </div>
    {plans[0] && (
      <div className="screen">
        <WorkoutRunner
          plan={plans[0]}
          exercises={EXERCISES}
          workoutId="preview"
          startedAt={Date.now()}
          onFinish={() => {}}
          onCancel={() => {}}
        />
      </div>
    )}
    <div style={{ display: "grid", gap: 12, padding: 12 }}>
      <MuscleMap primary="chest" secondary={["triceps", "shoulders"]} />
      <MuscleMap primary="lats" secondary={["back", "biceps"]} />
      <MuscleMap primary="quads" secondary={["glutes", "hamstrings"]} />
      <MuscleMap primary="shoulders" secondary={["traps", "triceps"]} />
    </div>
  </div>,
);
