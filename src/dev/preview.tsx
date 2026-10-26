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
