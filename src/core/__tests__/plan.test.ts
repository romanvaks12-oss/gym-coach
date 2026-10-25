import { describe, expect, it } from "vitest";
import type { Brief } from "../../types";
import { EXERCISES } from "../../domain/catalog";
import type { PerformedSet } from "../progression";
import { buildPlans, daysBetween, daysSinceMuscle, weeklySets } from "../plan";
import { computeReadiness } from "../readiness";

const TODAY = "2026-10-25";

const brief = (overrides: Partial<Brief> = {}): Brief => ({
  sleep: 5,
  energy: 5,
  stress: 1,
  minutes: 60,
  soreness: {},
  ...overrides,
});

const set = (exerciseId: string, date: string): PerformedSet => ({
  exerciseId,
  weight: 60,
  reps: 8,
  rpe: 8,
  date,
});

describe("daysBetween", () => {
  it("считает разницу в днях", () => {
    expect(daysBetween("2026-10-20", TODAY)).toBe(5);
    expect(daysBetween(TODAY, TODAY)).toBe(0);
  });
});

describe("daysSinceMuscle / weeklySets", () => {
  const history = [set("bb-back-squat", "2026-10-23"), set("bb-back-squat", "2026-10-23")];

  it("возвращает дни с последней нагрузки группы", () => {
    expect(daysSinceMuscle(history, EXERCISES, "quads", TODAY)).toBe(2);
  });

  it("null, если группу не грузили", () => {
    expect(daysSinceMuscle(history, EXERCISES, "chest", TODAY)).toBeNull();
  });

  it("считает подходы за неделю", () => {
    expect(weeklySets(history, EXERCISES, "quads", TODAY)).toBe(2);
    expect(weeklySets(history, EXERCISES, "quads", "2026-11-25")).toBe(0);
  });
});

describe("buildPlans", () => {
  it("без истории предлагает всё тело первым", () => {
    const readiness = computeReadiness(brief());
    const plans = buildPlans({
      brief: brief(),
      readiness,
      history: [],
      exercises: EXERCISES,
      todayIso: TODAY,
    });
    expect(plans.length).toBeGreaterThan(0);
    expect(plans[0].dayType).toBe("full");
    expect(plans[0].items.length).toBeGreaterThanOrEqual(4);
    expect(plans[0].items.length).toBeLessThanOrEqual(6);
  });

  it("не ставит упражнения на заблокированную группу", () => {
    const sore = brief({ soreness: { chest: 9, shoulders: 9 } });
    const readiness = computeReadiness(sore);
    const plans = buildPlans({
      brief: sore,
      readiness,
      history: [],
      exercises: EXERCISES,
      todayIso: TODAY,
    });
    const chestIds = new Set(
      EXERCISES.filter((e) => e.primaryMuscle === "chest" || e.primaryMuscle === "shoulders").map(
        (e) => e.id,
      ),
    );
    for (const plan of plans) {
      for (const item of plan.items) {
        expect(chestIds.has(item.exerciseId)).toBe(false);
      }
    }
  });

  it("низкая готовность → один вариант и меньше подходов", () => {
    const tired = brief({ sleep: 1, energy: 1, stress: 5, soreness: { quads: 8 } });
    const readiness = computeReadiness(tired);
    const plans = buildPlans({
      brief: tired,
      readiness,
      history: [],
      exercises: EXERCISES,
      todayIso: TODAY,
    });
    expect(plans).toHaveLength(1);
    const totalSets = plans[0].items.reduce((sum, item) => sum + item.sets, 0);
    expect(totalSets).toBeLessThanOrEqual(plans[0].items.length * 3);
  });

  it("30 минут → максимум 4 упражнения", () => {
    const short = brief({ minutes: 30 });
    const plans = buildPlans({
      brief: short,
      readiness: computeReadiness(short),
      history: [],
      exercises: EXERCISES,
      todayIso: TODAY,
    });
    expect(plans[0].items.length).toBeLessThanOrEqual(4);
  });

  it("вес берётся из истории по двойной прогрессии", () => {
    const history = [
      set("bb-bench-press", "2026-10-22"),
      set("bb-bench-press", "2026-10-22"),
    ];
    const plans = buildPlans({
      brief: brief(),
      readiness: computeReadiness(brief()),
      history,
      exercises: EXERCISES,
      todayIso: TODAY,
    });
    const bench = plans[0].items.find((i) => i.exerciseId === "bb-bench-press");
    if (bench) {
      expect(bench.weight).toBe(60);
      expect(bench.reason.length).toBeGreaterThan(0);
    }
  });
});
