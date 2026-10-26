/**
 * Страница предпросмотра для проверки вёрстки без кликов:
 * http://127.0.0.1:5173/preview.html           — план, тренировка, карта мышц
 * http://127.0.0.1:5173/preview.html?view=progress — экран прогресса на демо-данных
 * http://127.0.0.1:5173/preview.html?view=settings — экран настроек (синк, бэкап)
 *
 * В прод-сборку не попадает.
 */
import { createRoot } from "react-dom/client";
import MuscleMap from "../components/MuscleMap";
import PlanPicker from "../screens/PlanPicker";
import WorkoutRunner from "../screens/WorkoutRunner";
import SettingsScreen from "../screens/SettingsScreen";
import { ProgressView } from "../screens/ProgressScreen";
import { addDays } from "../core/analytics";
import { buildPlans } from "../core/plan";
import { computeReadiness } from "../core/readiness";
import { EXERCISES } from "../domain/catalog";
import type { BodyMetric, Brief, SetLog, Workout } from "../types";
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

/** Демо-история за 8 недель: рост весов, пропуск недели, вес тела вверх. */
const PROGRAM = [
  { id: "bb-back-squat", base: 70, step: 5, reps: [8, 8, 6] },
  { id: "bb-bench-press", base: 55, step: 2.5, reps: [10, 8, 6] },
  { id: "bb-row", base: 45, step: 2.5, reps: [10, 10, 8] },
  { id: "bb-romanian-deadlift", base: 60, step: 5, reps: [10, 8, 8] },
  { id: "bodyweight-pull-up", base: 78.5, step: 0.6, reps: [8, 7, 6] },
];

const demoWorkouts: Workout[] = [];
const demoSets: SetLog[] = [];
const demoBody: BodyMetric[] = [];

for (let week = 7; week >= 0; week -= 1) {
  if (week === 5) continue; // неделя пропущена — на графике будет честный ноль
  const date = addDays(TODAY, -7 * week);
  const workoutId = `demo-w-${week}`;
  const createdAt = `${date}T18:00:00.000Z`;
  demoWorkouts.push({
    id: workoutId,
    date,
    readiness: 62 + (week % 3) * 8,
    durationMin: 52 + (week % 4) * 4,
    createdAt,
    updatedAt: createdAt,
    pendingSync: true,
  });

  for (const exercise of PROGRAM) {
    const weight = exercise.base + (7 - week) * exercise.step;
    exercise.reps.forEach((reps, index) => {
      demoSets.push({
        id: `${workoutId}-${exercise.id}-${index}`,
        workoutId,
        exerciseId: exercise.id,
        setIndex: index + 1,
        weight: Math.round(weight * 10) / 10,
        reps,
        rpe: index === 2 ? 9 : 8,
        isWarmup: false,
        createdAt,
        pendingSync: true,
      });
    });
  }

  demoBody.push({
    id: `demo-b-${week}`,
    date,
    weightKg: Math.round((78.3 + (7 - week) * 0.18) * 10) / 10,
    createdAt,
    pendingSync: true,
  });
}

const view = new URLSearchParams(window.location.search).get("view");

createRoot(document.getElementById("root")!).render(
  view === "progress" ? (
    <div style={{ width: 390, margin: "0 auto", padding: 16 }}>
      <ProgressView
        workouts={demoWorkouts}
        sets={demoSets}
        body={demoBody}
        todayIso={TODAY}
      />
    </div>
  ) : view === "settings" ? (
    <div style={{ width: 390, margin: "0 auto", padding: 16 }}>
      <SettingsScreen />
    </div>
  ) : view === "map" ? (
    <div style={{ width: 390, margin: "0 auto", display: "grid", gap: 12, padding: 12 }}>
      <MuscleMap primary="chest" secondary={["triceps", "shoulders"]} />
      <MuscleMap primary="lats" secondary={["back", "biceps"]} />
      <MuscleMap primary="quads" secondary={["glutes", "hamstrings"]} />
      <MuscleMap primary="shoulders" secondary={["traps", "triceps"]} />
    </div>
  ) : (
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
    </div>
  ),
);

/* Демо-сценарии для проверки правки подхода без ручных кликов:
   /preview.html?demo=warn — записать 12, потом ввести 112 и увидеть предупреждение
   /preview.html?demo=edit — записать подход и открыть его на правку */
const demo = new URLSearchParams(window.location.search).get("demo");

async function runDemo(kind: string) {
  const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const setValue = (el: HTMLInputElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const click = (text: string) => {
    const btn = [...document.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === text,
    );
    btn?.click();
    return Boolean(btn);
  };

  await wait(400);
  const inputs = [...document.querySelectorAll<HTMLInputElement>(".screen .input")];
  const weightInput = inputs.find((i) => i.inputMode === "decimal");
  const repsInput = inputs.find((i) => i.inputMode === "numeric");
  if (!weightInput || !repsInput) return;

  setValue(weightInput, "12");
  setValue(repsInput, "8");
  await wait(120);
  click("Записать подход");
  await wait(250);

  if (kind === "warn") {
    setValue(weightInput, "112");
    await wait(120);
    click("Записать подход");
  }
  if (kind === "edit") {
    click("правка");
  }
}

if (demo) void runDemo(demo);
