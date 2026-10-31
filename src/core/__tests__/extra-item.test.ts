import { describe, expect, it } from "vitest";
import { EXERCISES } from "../../domain/catalog";
import type { PerformedSet } from "../progression";
import { buildPlanItem } from "../plan";
import type { Exercise } from "../../types";

const exercise = (id: string): Exercise => {
  const found = EXERCISES.find((item) => item.id === id);
  if (!found) throw new Error(`нет упражнения ${id} в каталоге`);
  return found;
};

const performed = (exerciseId: string, weight: number, reps: number): PerformedSet => ({
  exerciseId,
  weight,
  reps,
  rpe: 8,
  date: "2026-10-27",
});

describe("buildPlanItem — рекомендация для добавленного упражнения", () => {
  it("без истории даёт разумный стартовый диапазон и RPE 8", () => {
    const item = buildPlanItem({ exercise: exercise("bb-curl"), history: [] });

    expect(item.sets).toBeGreaterThanOrEqual(2);
    expect(item.sets).toBeLessThanOrEqual(4);
    expect(item.repLow).toBeLessThanOrEqual(item.repHigh);
    expect(item.repTarget).toBeGreaterThanOrEqual(item.repLow);
    expect(item.repTarget).toBeLessThanOrEqual(item.repHigh);
    expect(item.targetRpe).toBe(8);
    expect(item.measure).toBe("reps");
  });

  it("на пониженной готовности ставит RPE 7 и меньше подходов", () => {
    const normal = buildPlanItem({ exercise: exercise("bb-bench-press"), history: [] });
    const low = buildPlanItem({
      exercise: exercise("bb-bench-press"),
      history: [],
      volumeMultiplier: 0.6,
      band: "low",
    });

    expect(low.targetRpe).toBe(7);
    expect(low.sets).toBeLessThanOrEqual(normal.sets);
  });

  it("учитывает прошлую тренировку и не предлагает меньше сделанного", () => {
    const history = [performed("bb-bench-press", 60, 10), performed("bb-bench-press", 60, 10)];
    const item = buildPlanItem({ exercise: exercise("bb-bench-press"), history });

    expect(item.weight).not.toBeNull();
    expect(item.weight ?? 0).toBeGreaterThanOrEqual(60);
    expect(item.reason.length).toBeGreaterThan(0);
  });

  it("упражнения на время считаются в секундах", () => {
    const item = buildPlanItem({ exercise: exercise("bodyweight-plank"), history: [] });

    expect(item.measure).toBe("time");
    expect(item.repLow).toBeGreaterThanOrEqual(20);
  });

  it("упражнения со своим весом не требуют вес снаряда", () => {
    const item = buildPlanItem({ exercise: exercise("bodyweight-pull-up"), history: [] });

    expect(item.usesBodyweight).toBe(true);
    expect(item.weight).toBeNull();
    expect(item.sets).toBeLessThanOrEqual(3);
  });

  it("не мутирует историю и возвращает независимый объект", () => {
    const history = [performed("bb-row", 50, 10)];
    const copy = [...history];
    const item = buildPlanItem({ exercise: exercise("bb-row"), history });

    expect(history).toEqual(copy);
    expect(item.exerciseId).toBe("bb-row");
  });
});
